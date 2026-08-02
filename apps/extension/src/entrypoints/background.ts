export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    console.info("Repin extension installed");
  });
});
