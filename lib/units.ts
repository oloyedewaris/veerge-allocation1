import { BaseURL, LOCAL_ESUB_DOMAIN } from "./constants/auth-keys";

const storeCheckUrl = `${BaseURL}/billing/esub/domain/${encodeURIComponent(LOCAL_ESUB_DOMAIN)}/`;

export type LocalUnit = {
  block: string;
  id: string;
  model: string;
  landArea: string;
  buildArea: string;
  bedrooms: string;
  bathrooms: string;
  master: string;
  living: string;
  kitchen: string;
  guest: string;
  direction: string;
  availability: string;
  name: string;
  allocated: boolean;
};

export type ProjectAllocation = {
  id: number;
  name: string;
  unit: number;
  unit_name: string;
  allocated: boolean;
  generating_revenue: boolean;
  archived: boolean;
  owner: unknown | null;
};

type AllocationResponse = {
  data: ProjectAllocation[];
};

export type MergedUnit = LocalUnit & {
  allocationId?: number;
  unit?: number;
  unitName?: string;
  generatingRevenue?: boolean;
  archived?: boolean;
  owner?: unknown | null;
};

const LOCAL_UNITS_URL = "/reference-assets/units.json";
const ALLOCATIONS_URL = "/api/project-allocations";

export async function fetchMergedUnits(): Promise<MergedUnit[]> {
  const localResponse = await fetch(LOCAL_UNITS_URL);
  if (!localResponse.ok) {
    throw new Error(`Unable to load local units (${localResponse.status})`);
  }

  const localUnits = (await localResponse.json()) as LocalUnit[];

  try {
    const allocationResponse = await fetch(ALLOCATIONS_URL, {
      cache: "no-store",
    });
    if (!allocationResponse.ok) {
      throw new Error(
        `Unable to load project allocations (${allocationResponse.status})`,
      );
    }

    const payload = (await allocationResponse.json()) as AllocationResponse;
    const allocationsByName = new Map(
      payload.data.map((allocation) => [allocation.name, allocation]),
    );

    return localUnits.map((localUnit) => {
      const allocation = allocationsByName.get(localUnit.name);
      if (!allocation) return localUnit;

      return {
        ...localUnit,
        allocationId: allocation.id,
        unit: allocation.unit,
        unitName: allocation.unit_name,
        allocated: allocation.allocated,
        generatingRevenue: allocation.generating_revenue,
        archived: allocation.archived,
        owner: allocation.owner,
      };
    });
  } catch (error) {
    console.error(
      "Using local unit data because project allocations could not be loaded",
      error,
    );
    return localUnits;
  }
}

export async function getEsubDetails(): Promise<any> {
  const response = await fetch(storeCheckUrl, { cache: "no-store" });
  if (!response.ok)
    throw new Error(
      `Could not load apartment allocations (${response.status} ${response.statusText}).`,
    );

  const payload = (await response.json()) as any;
  return payload;
}
