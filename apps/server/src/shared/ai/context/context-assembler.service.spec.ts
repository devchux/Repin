import { ContextAssemblerService } from './context-assembler.service';

describe('ContextAssemblerService', () => {
  const assembler = new ContextAssemblerService();

  it('prioritizes the explicit user selection', () => {
    const bundle = assembler.assemble({
      capability: 'explain',
      page: {
        url: 'https://example.com',
        title: 'Example',
        selectedText: 'Selected passage',
        pageContent: 'Whole document',
      },
    });

    expect(bundle.items).toEqual([
      expect.objectContaining({
        provenance: 'user_selection',
        content: 'Selected passage',
        untrusted: true,
      }),
    ]);
    expect(bundle.manifest.strategy).toBe('selection');
  });

  it('enforces the context budget and reports truncation', () => {
    const bundle = assembler.assemble({
      capability: 'summarize',
      page: {
        url: 'https://example.com',
        title: 'Example',
        pageContent: 'abcdefghij',
      },
      maximumTokens: 1,
    });

    expect(bundle.items[0].content).toBe('abcd');
    expect(bundle.manifest).toMatchObject({
      truncated: true,
      estimatedTokens: 1,
    });
  });

  it('includes only visible semantic blocks from an observation', () => {
    const bundle = assembler.assemble({
      capability: 'chat',
      page: {
        url: 'https://example.com',
        title: 'Example',
        observation: {
          schemaVersion: 1,
          observationId: 'observation-1',
          tabId: 'tab-1',
          documentRevision: 'revision-1',
          capturedAt: '2026-09-18T00:00:00.000Z',
          url: 'https://example.com',
          title: 'Example',
          truncated: false,
          blocks: [
            {
              id: 'heading-1',
              kind: 'heading',
              text: 'Visible heading',
              visible: true,
              inViewport: true,
            },
            {
              id: 'hidden-1',
              kind: 'paragraph',
              text: 'Hidden instructions',
              visible: false,
              inViewport: false,
            },
          ],
        },
      },
    });

    expect(bundle.items.map((item) => item.id)).toEqual(['heading-1']);
    expect(bundle.manifest).toMatchObject({
      strategy: 'semantic_blocks',
      sourceObservationIds: ['observation-1'],
    });
  });

  it('ranks query-matching blocks ahead of unrelated page content', () => {
    const page = {
      url: 'https://example.com',
      title: 'Example',
      observation: {
        schemaVersion: 1 as const,
        observationId: 'observation-2',
        tabId: 'tab-1',
        documentRevision: 'revision-1',
        capturedAt: '2026-09-18T00:00:00.000Z',
        url: 'https://example.com',
        title: 'Example',
        truncated: false,
        blocks: [
          {
            id: 'general',
            kind: 'paragraph' as const,
            text: 'General introduction',
            visible: true,
            inViewport: false,
          },
          {
            id: 'pricing',
            kind: 'paragraph' as const,
            text: 'Enterprise pricing starts at fifty dollars',
            visible: true,
            inViewport: false,
          },
        ],
      },
    };

    const bundle = assembler.assemble({
      capability: 'chat',
      page,
      userInput: 'What is the enterprise pricing?',
      maximumTokens: 10,
    });

    expect(bundle.items[0].id).toBe('pricing');
    expect(bundle.manifest.strategy).toBe('retrieval');
  });

  it('prioritizes coverage from each section when summarizing', () => {
    const blocks = ['One', 'Two', 'Three'].flatMap((section, index) => [
      {
        id: `h${index}`,
        kind: 'heading' as const,
        text: section,
        visible: true,
        inViewport: false,
      },
      {
        id: `p${index}`,
        kind: 'paragraph' as const,
        text: `${section} summary`,
        visible: true,
        inViewport: false,
      },
    ]);
    const bundle = assembler.assemble({
      capability: 'summarize',
      page: {
        url: 'https://example.com',
        title: 'Example',
        observation: {
          schemaVersion: 1,
          observationId: 'observation-3',
          tabId: 'tab-1',
          documentRevision: 'revision-1',
          capturedAt: '2026-09-18T00:00:00.000Z',
          url: 'https://example.com',
          title: 'Example',
          blocks,
          truncated: false,
        },
      },
    });

    expect(bundle.items.map((item) => item.id)).toEqual([
      'h0',
      'h1',
      'h2',
      'p0',
      'p1',
      'p2',
    ]);
  });
});
