import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useState,
} from 'react';

//TODO: remove this since it's not used anywhere
// export type qrList = {
//   firstField: {
//     name: string;
//     value: string;
//     excluded: boolean;
//   };
//   secondField: {
//     name: string;
//     value: string;
//     excluded: boolean;
//   };
//   thirdField: {
//     name: string;
//     value: string;
//     excluded: boolean;
//   };
//   fourthField: {
//     name: string;
//     value: string;
//     excluded: boolean;
//   };
//   fifthField: {
//     name: string;
//     value: string;
//     excluded: boolean;
//   };
//   value: string;
// }[];

export type queueList = {
  id: string;
  progress: number;
  target: number;
  baseMessage: string;
  isDownloading: boolean;
}[];

interface ProgressBar {
  queue: queueList | null;
  worker:
    | {
        worker: Worker;
        jobId: string;
      }[]
    | null;
  setQueue: Dispatch<SetStateAction<queueList | null>>;
  setWorker: Dispatch<
    SetStateAction<
      | {
          worker: Worker;
          jobId: string;
        }[]
      | null
    >
  >;
  onAbort: (jobId: string) => void;
  onAbortAll: () => void;
}

export const ProgressBarContext = createContext<ProgressBar | undefined>(
  undefined
);

//TODO: remove this since it's not used anywhere
// export const useProgressBar = () => useContext(ProgressBarContext);

type ProgressBarProps = {
  children: ReactNode;
};

export const ProgressBarProvider = ({ children }: ProgressBarProps) => {
  const [queue, setQueue] = useState<queueList | null>(null);

  const stopDownload = useCallback((jobId: string) => {
    setQueue((prev) => {
      if (prev) {
        return prev.filter((item) => item.id !== jobId);
      }

      return prev;
    });
  }, []);

  const [worker, setWorker] = useState<
    | {
        worker: Worker;
        jobId: string;
      }[]
    | null
  >(null);

  const onAbort = (jobId: string) => {
    stopDownload(jobId);
    if (worker) {
      const currentWorker = worker.find((w) => w.jobId === jobId);
      if (currentWorker) currentWorker.worker.terminate();
    }
  };

  const onAbortAll = () => {
    setQueue(null);
    if (worker) {
      worker.forEach((w) => {
        w.worker.terminate();
      });
    }
  };

  return (
    <ProgressBarContext.Provider
      value={{
        queue,
        worker,
        setQueue,
        setWorker,
        onAbort,
        onAbortAll,
      }}
    >
      {children}
    </ProgressBarContext.Provider>
  );
};
