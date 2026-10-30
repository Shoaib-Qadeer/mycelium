export type Person = {
  _id: string;
  name: string;
  circle: string;
  field: string;
  role: string;
  org: string;
  city: string;
  country: string;
  tags: string[];
  closeness: number; // 1 (acquaintance) – 5 (inner circle)
  lastContact: string; // YYYY-MM-DD or ""
  email: string;
  notes: string;
  hidden: boolean; // hidden from the club overlay
};

export type PersonInput = Partial<Omit<Person, "_id">> & { name: string };

export type Link = {
  _id: string;
  a: string;
  b: string;
  label: string;
};

export type Insight = {
  id: string;
  kind: "strength" | "watch" | "idea";
  title: string;
  detail: string;
  nodeIds: string[];
};

// Club overlay: what other members see. No names, notes or contact details.
export type BlindNode = {
  id: string;
  type: "member" | "person";
  label: string; // member name, or "Researcher · Stockholm"-style card summary
  field: string;
  role: string;
  org: string;
  city: string;
  country: string;
  tags: string[];
  knownBy: { email: string; name: string; closeness: number }[];
  mine?: string; // the person's real name, only when it's in the viewer's own map
};

export type ClubGraph = {
  me: string;
  nodes: BlindNode[];
  edges: { source: string; target: string; kind: "knows" | "link" }[];
  members: { email: string; name: string; image?: string; people: number }[];
};

export type Intro = {
  _id: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  toName: string;
  personId: string;
  personLabel: string;
  personName?: string; // only sent to the connector
  message: string;
  status: "pending" | "accepted" | "declined";
  responseNote: string;
  createdAt: string;
};
