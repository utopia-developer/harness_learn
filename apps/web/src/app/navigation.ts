import { APP_PAGES } from "./shell.js";

export type WebNavigationItem = {
  label: string;
  href: string;
};

export const WEB_NAVIGATION: WebNavigationItem[] = APP_PAGES.map((page) => ({
  label: page.label,
  href: page.href
}));
