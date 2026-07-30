// React builtins
import { useContext, useMemo } from 'react';
// For parsing & modifying URL search params
import { useSearchParams } from 'react-router-dom';

// Context for passing project
import { ProjectCtx } from '../../../project-ctx';
import { ConnectedEquipments } from './components/connected-equipments';
import { GatewayDetails } from './components/gateway-details';
// Components
import { GatewayList } from './components/gateway-list';
import { GatewayTabs, Menu } from './components/gateway-tabs';
import { GatewayTags } from './components/gateway-tags';
import { PrjCtx } from './contexts';
// Style
import style from './gateway-manager.module.scss';

export const GatewayManager = () => {
  const { projectVariant: prj } = useContext(ProjectCtx);

  // For filtering & paging from url
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse the search params
  const params = useMemo(() => {
    let gatewayListPage = parseInt(searchParams.get('list_page') || '1');

    if (isNaN(gatewayListPage) || gatewayListPage <= 0) {
      gatewayListPage = 1;
    }

    let gatewayTagsPage = parseInt(searchParams.get('tags_page') || '1');

    if (isNaN(gatewayTagsPage) || gatewayTagsPage <= 0) {
      gatewayTagsPage = 1;
    }

    let connectedEquipmentsPage = parseInt(
      searchParams.get('connected_equipments_page') || '1'
    );

    if (isNaN(connectedEquipmentsPage) || connectedEquipmentsPage <= 0) {
      connectedEquipmentsPage = 1;
    }

    return {
      selected: searchParams.get('selected') || '',
      gatewayListSearch: searchParams.get('list_search') || '',
      gatewayListPage,
      gatewayTagsSearch: searchParams.get('tags_search') || '',
      gatewayTagsPage,
      gatewayTagsSortKey: searchParams.get('tags_sort_key') || '',
      gatewayTagsOrder: searchParams.get('tags_order') || '',
      connectedEquipmentsSearch:
        searchParams.get('connected_equipments_search') || '',
      connectedEquipmentsPage,
      connectedEquipmentsSortKey:
        searchParams.get('connected_equipments_sort_key') || '',
      connectedEquipmentsOrder:
        searchParams.get('connected_equipments_order') || '',
      menu:
        searchParams.get('menu') === 'connected_equipments'
          ? Menu.CONNECTED_EQUIPMENTS
          : Menu.TAG_LIST,
    };
  }, [searchParams]);

  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     setSearchParams((prev) => {
  //       prev.delete('selected');
  //       return new URLSearchParams(prev);
  //     });
  //   }, 5000);

  //   return () => {
  //     clearTimeout(timer);
  //   };
  // }, [params.selected]);

  return (
    <PrjCtx.Provider value={prj}>
      <div className={style['gateway-manager']}>
        <GatewayList
          search={params.gatewayListSearch}
          page={params.gatewayListPage}
          selected={params.selected}
          onSelect={(gateway) => {
            setSearchParams((prev) => {
              prev.set('selected', gateway);
              return new URLSearchParams(prev);
            });
          }}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
        />
        <GatewayDetails gatewayAlias={params.selected} />
        <GatewayTabs
          menu={params.menu}
          onChangeMenu={(menu) => {
            setSearchParams((prev) => {
              prev.set('menu', menu);
              return new URLSearchParams(prev);
            });
          }}
          tagList={
            <GatewayTags
              gatewayAlias={params.selected}
              search={params.gatewayTagsSearch}
              page={params.gatewayTagsPage}
              sortKey={params.gatewayTagsSortKey}
              order={params.gatewayTagsOrder}
              searchParams={searchParams}
              setSearchParams={setSearchParams}
            />
          }
          connectedEquipments={
            <ConnectedEquipments
              gatewayAlias={params.selected}
              search={params.connectedEquipmentsSearch}
              page={params.connectedEquipmentsPage}
              sortKey={params.connectedEquipmentsSortKey}
              order={params.connectedEquipmentsOrder}
              searchParams={searchParams}
              setSearchParams={setSearchParams}
            />
          }
        />
      </div>
    </PrjCtx.Provider>
  );
};
