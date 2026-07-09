import type { Content } from "../Flattenners";

function asRecord(value: unknown): Record<string, unknown> {
  return (value as Record<string, unknown>) ?? {};
}

function asRecordList(value: unknown): Array<Record<string, unknown>> {
  return (value as Array<Record<string, unknown>>) ?? [];
}

interface Banner {
  id: number | null;
  properties: Record<string, unknown>;
}

interface Sifter {
  id: number | null;
  sifter: string;
}

interface Dashboard {
  dashboardId: number | null;
  sifterId: number | null;
}

export const QuestionFormatter = {
  formatFromContent(content: Content): {
    handlers: { handlesSifters: Array<{ id: number | null; keyword: string }> };
    banners: Array<Record<string, unknown>>;
  } {
    const records = content.records;
    const dashboardsSiftersMap = records.dashboardsSifters;
    let contentInput: {
      records: {
        dashboardsSifters: { sifters: Sifter[]; dashboards: Dashboard[] };
      };
    } | null = null;
    let banners: Banner[] = [];

    if (dashboardsSiftersMap != null) {
      const dsMap = asRecord(dashboardsSiftersMap);
      const sifterMaps = asRecordList(dsMap.sifters);
      const sifters: Sifter[] = sifterMaps.map((sifterMap) => ({
        id: sifterMap.id as number | null,
        sifter: sifterMap.sifter as string,
      }));

      const dashboardMaps = asRecordList(dsMap.dashboards);
      const dashboards: Dashboard[] = dashboardMaps.map((dashboardMap) => ({
        dashboardId: dashboardMap.dashboardId as number | null,
        sifterId: dashboardMap.sifterId as number | null,
      }));

      banners = sifterMaps.map((bannerMap) => {
        const sifterId = bannerMap.id as number | null;
        const properties = { ...bannerMap };
        const dashboard =
          dashboardMaps.find((d) => d.sifterId === sifterId) ?? {};
        properties.bannerId = dashboard.dashboardId;
        properties.quote = bannerMap.purpose;
        properties.ordinal = dashboard.ordinal;
        properties.title = bannerMap.sifter;
        properties.owner = dashboard.owner;
        properties.pennants = [];
        return {
          id: dashboard.sifterId as number | null,
          properties,
        };
      });

      contentInput = {
        records: { dashboardsSifters: { sifters, dashboards } },
      };
    }

    if (contentInput == null) {
      contentInput = {
        records: { dashboardsSifters: { sifters: [], dashboards: [] } },
      };
    }

    return QuestionFormatter.format({ content: contentInput, banners });
  },

  format(input: {
    content: {
      records: {
        dashboardsSifters: { sifters: Sifter[]; dashboards: Dashboard[] };
      };
    } | null;
    banners: Banner[];
  }): {
    handlers: { handlesSifters: Array<{ id: number | null; keyword: string }> };
    banners: Array<Record<string, unknown>>;
  } {
    const banners = input.banners;
    const dashboardsSifters =
      input.content?.records?.dashboardsSifters ?? {
        sifters: [],
        dashboards: [],
      };

    const sifters = dashboardsSifters.sifters ?? [];

    const handlesSifters = sifters.map((sifter) => ({
      id: sifter.id,
      keyword: sifter.sifter,
    }));

    const handlers = { handlesSifters };

    const bannersWithBannerId = banners.map((banner) => {
      const bannerData = { ...banner.properties };
      bannerData.id = banner.id;
      return bannerData;
    });

    return { handlers, banners: bannersWithBannerId };
  },
};
