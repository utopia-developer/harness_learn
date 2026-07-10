import { WEB_ROUTES } from "../../../../packages/contracts/src/index.js";

export type WebNavigationItem = {
  label: string;
  href: string;
};

export const WEB_NAVIGATION: WebNavigationItem[] = [
  {
    label: "任务",
    href: WEB_ROUTES.tasks
  },
  {
    label: "审批",
    href: WEB_ROUTES.approvals
  },
  {
    label: "策略",
    href: WEB_ROUTES.policy
  },
  {
    label: "插件",
    href: WEB_ROUTES.plugins
  }
];
