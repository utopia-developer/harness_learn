import { WEB_ROUTES } from "../../../../packages/contracts/src/index.js";

export type AppPageId =
  | "tasks"
  | "approvals"
  | "release-readiness"
  | "policy"
  | "plugins";

export type AppPage = {
  id: AppPageId;
  label: string;
  href: string;
  title: string;
  description: string;
};

export type AppNavigationItem = AppPage & {
  active: boolean;
  ariaCurrent?: "page";
};

export type AppShellViewModel = {
  brand: string;
  currentPage: AppPage;
  navigation: AppNavigationItem[];
  topbar: {
    title: string;
    description: string;
  };
  mainRegionAriaLabel: string;
};

export const APP_PAGES: AppPage[] = [
  {
    id: "tasks",
    label: "任务",
    href: WEB_ROUTES.tasks,
    title: "任务中心",
    description: "查看 Agent 任务、运行状态和待处理事项。"
  },
  {
    id: "approvals",
    label: "审批",
    href: WEB_ROUTES.approvals,
    title: "审批队列",
    description: "确认高风险工具调用，并沉淀可复用的权限规则。"
  },
  {
    id: "release-readiness",
    label: "发布",
    href: WEB_ROUTES.releaseReadiness("current"),
    title: "发布就绪",
    description: "聚合评测、成本、质量和策略检查结果。"
  },
  {
    id: "policy",
    label: "策略",
    href: WEB_ROUTES.policy,
    title: "策略中心",
    description: "管理团队、项目、工具和模型使用边界。"
  },
  {
    id: "plugins",
    label: "插件",
    href: WEB_ROUTES.plugins,
    title: "插件中心",
    description: "管理团队共享工具、Skill 和外部集成能力。"
  }
];

export function createAppShellViewModel(
  pathname: string = WEB_ROUTES.tasks
): AppShellViewModel {
  const currentPage = findCurrentPage(pathname);
  return {
    brand: "Harness Console",
    currentPage,
    navigation: APP_PAGES.map((page) => ({
      ...page,
      active: page.id === currentPage.id,
      ...(page.id === currentPage.id ? { ariaCurrent: "page" as const } : {})
    })),
    topbar: {
      title: currentPage.title,
      description: currentPage.description
    },
    mainRegionAriaLabel: `${currentPage.title}内容区`
  };
}

function findCurrentPage(pathname: string): AppPage {
  if (pathname.startsWith("/approvals")) {
    return pageById("approvals");
  }
  if (pathname.startsWith("/releases")) {
    return pageById("release-readiness");
  }
  if (pathname.startsWith("/settings/policy")) {
    return pageById("policy");
  }
  if (pathname.startsWith("/settings/plugins")) {
    return pageById("plugins");
  }
  return pageById("tasks");
}

function pageById(id: AppPageId): AppPage {
  const page = APP_PAGES.find((item) => item.id === id);
  if (!page) {
    throw new Error(`Unknown page: ${id}`);
  }
  return page;
}
