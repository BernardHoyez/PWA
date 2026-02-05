function extractImgboxLinks(html) {
  const regex = /https:\/\/images\d+\.imgbox\.com\/[^"' ]+\.(jpg|jpeg|png)/gi;
  return [...new Set(html.match(regex) || [])];
}
