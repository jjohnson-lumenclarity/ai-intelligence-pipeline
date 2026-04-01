import Parser from "rss-parser";

export const rssParser = new Parser();

export async function fetchFeed(url: string) {
  return rssParser.parseURL(url);
}
