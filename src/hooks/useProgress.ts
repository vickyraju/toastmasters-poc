"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getServices,
  type LogCompletionInput,
  type UploadFile,
} from "@/lib/services";
import { useAction } from "./useAction";
import { qk } from "./keys";

export function useClubProgress() {
  return useQuery({
    queryKey: ["club-progress"],
    queryFn: () => getServices().progress.clubTable(),
  });
}

export const useUploadProof = () =>
  useAction((file: UploadFile) => getServices().progress.uploadProof(file));

/** Uploads the proof first when there is one, then logs. A level goes to the VPE; a project counts at once (R-11). */
export const useLogCompletion = () =>
  useAction(
    async (a: { input: LogCompletionInput; proof?: UploadFile }) => {
      const s = getServices().progress;
      const proofFileId = a.proof
        ? (await s.uploadProof(a.proof)).id
        : a.input.proofFileId;
      return s.log({ ...a.input, proofFileId });
    },
    (a) =>
      a.input.kind === "level"
        ? "Level logged. Your VPE will verify it."
        : "Project logged.",
  );

export { qk };
