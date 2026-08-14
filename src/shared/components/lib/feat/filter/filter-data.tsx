import {
  createContext,
  forwardRef,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';

export type Data = Record<string, (string | number)[] | null>;

export type TCoreFilterContext = {
  setData: React.Dispatch<React.SetStateAction<Data>>;
  data: Data;
};

const CoreFilterContext = createContext<TCoreFilterContext | null>(null);

export type CoreFilterProviderRef = {
  getData: () => Data;
};

type CoreFilterProviderProps = {
  children: ReactNode;
  data?: Data;
  setData?: React.Dispatch<React.SetStateAction<Data>>;
};

export const CoreFilterProvider = forwardRef<
  CoreFilterProviderRef,
  CoreFilterProviderProps
>(({ data: parentData, children, setData: setParentData }, ref) => {
  const [data, setData] = useState<Data>(() => {
    if (parentData !== undefined) return parentData;
    return {};
  });

  useEffect(() => {
    if (parentData !== undefined) setData({ ...parentData });
  }, [JSON.stringify(parentData)]);

  useImperativeHandle(
    ref,
    () => {
      return {
        getData: () => data,
      };
    },
    [data]
  );

  return (
    <CoreFilterContext.Provider
      value={{
        data: data,
        setData: setParentData ?? setData,
      }}
    >
      {children}
    </CoreFilterContext.Provider>
  );
});

export const useCoreFilterClient = () => {
  const ctx = useContext(CoreFilterContext);
  if (ctx === null)
    throw Error(
      'useCoreFilterClient must be used inside <CoreFilterProvider></CoreFilterProvider>'
    );

  return ctx;
};

type TUseFilterParams<T extends string | number> = {
  data?: { id: T; name: string }[];
  key: string;
};

export function useCoreFilter<T extends string | number>({
  data,
  key,
}: TUseFilterParams<T>) {
  const coreFilter = useCoreFilterClient();
  const selected = useMemo(
    () => coreFilter.data[key],
    [JSON.stringify(coreFilter.data[key])]
  );

  //TODO: remove useCallback
  const handleRootNodeChange = useCallback(
    (checked: boolean) => {
      if (checked)
        coreFilter.setData((prev) => ({
          ...prev,
          [key]: null,
        }));
      else
        coreFilter.setData((prev) => ({
          ...prev,
          [key]: [],
        }));
    },
    [coreFilter]
  );

  const handleNodeChange = (id: T, checked: boolean) => {
    if (checked)
      coreFilter.setData((prev) => ({
        ...prev,
        [key]:
          (prev[key]?.length ?? 0) + 1 === (data?.length ?? 0)
            ? null
            : [...(prev[key] ?? []), id],
      }));
    else {
      coreFilter.setData((prev) => ({
        ...prev,
        [key]:
          prev[key] === null
            ? (data ?? []).map((i) => i.id).filter((i) => i !== id)
            : prev[key]?.filter((i) => i !== id) ?? [],
      }));
    }
  };

  const isRootNodeChecked =
    selected === null ? true : selected.length > 0 ? undefined : false;
  const nodes = data?.map((i) => ({
    ...i,
    checked: isRootNodeChecked || (selected?.includes(i.id) ?? false),
  }));

  return {
    nodes,
    handleRootNodeChange,
    handleNodeChange,
    isRootNodeChecked,
    selected,
  };
}
