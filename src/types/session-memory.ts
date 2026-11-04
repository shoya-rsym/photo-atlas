export type SessionMemory = {
  id: string;
  locationId: string;
  sessionDate: string;
  text: string;
  generatedBy: "template" | "ai" | "copilot" | "manual";
  createdAt: string;
  updatedAt: string;
};
