import {
  AssetEnergyOverview,
  ConditionShortcut,
  ConditionTree,
  LocationShortcut,
  ModelShortcut,
  ModelTree,
  StatusShortcut,
} from '@digital-twin/components';

import { FILTER_KEY_TYPE, StatusTree, TypeShortcut, TypeTree } from '../../components';
import { getAssetOverview } from './api';
import { AssetLegend } from './asset-legend';
import { useAssetOverview } from './asset-overview.hook';

export const AssetOverview = () => {
  const { sheetsParserFn, exportFn } = useAssetOverview();

  return (
    <AssetEnergyOverview
      typeFilterKey={FILTER_KEY_TYPE}
      queryFn={getAssetOverview}
      exportFn={exportFn}
      legend={<AssetLegend />}
      sheetsParserFn={sheetsParserFn}
      filterTreeChildren={
        <>
          <StatusTree />
          <ConditionTree />
          <ModelTree />
          <TypeTree />
        </>
      }
      filterShortcutChildren={
        <>
          <LocationShortcut />
          <StatusShortcut />
          <ConditionShortcut />
          <ModelShortcut />
          <TypeShortcut />
        </>
      }
    />
  );
};
