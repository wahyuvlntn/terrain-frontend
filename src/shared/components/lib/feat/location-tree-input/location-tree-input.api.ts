import { jsRequest } from '@digital-twin/utils';

export type TreeNode = {
  id: number;
  name: string;
  childs?: TreeNode[];
};

type TGetLocationTreeInput = {
  searchFilter: string | null;
  excludedId: number | null;
  locationId: number | null;
};
export const getLocationTreeInput = async ({
  excludedId,
  locationId,
  searchFilter,
}: TGetLocationTreeInput): Promise<TreeNode[] | null> => {
  try {
    const data = await jsRequest({
      url: `/filter/getlocationtreeinput`,
      data: {
        search_filter: searchFilter,
        excluded_id: excludedId,
        location_id: locationId,
      },
    });

    return data
      .map((item: { build_location_tree: string }) =>
        JSON.parse(item.build_location_tree)
      )
      .flat(1);
  } catch (e) {
    return null;
  }
};
