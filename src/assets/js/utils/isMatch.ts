export default function isMatch(bp:number) {
  const mediaQuery= matchMedia(`(min-width:${bp}px)`)
  let isMatch = mediaQuery.matches;
  handle(mediaQuery);
  mediaQuery.addEventListener("change", handle);
  function handle(e:any) {
    isMatch = e.matches;
  }
  return () => isMatch;
}
