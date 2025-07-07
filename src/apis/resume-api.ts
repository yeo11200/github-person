import fetchApi from "@/utils/fetch-api";
import type { APIResponse } from "@/types/apis";
import type { Resume, ResumeList } from "@/types/apis/github-resume";

const getResumeList = async () => {
  const response = await fetchApi<APIResponse<ResumeList[]>>("/resume/list");
  return response.data;
};

const getResume = async (id: string) => {
  const response = await fetchApi<APIResponse<Resume>>(`/resume/${id}`);
  return response.data;
};

export { getResume, getResumeList };
