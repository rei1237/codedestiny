export type BreadcrumbItem = {
  name: string;
  path: string;
};

export function createBreadcrumbs(items: BreadcrumbItem[]) {
  return items.map((item, index) => ({
    ...item,
    position: index + 1,
  }));
}
