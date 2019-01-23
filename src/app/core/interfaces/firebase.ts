export interface User {
  email: string;
  name: string;
}

export interface Track {
  id: string;
  user: string;
  project: string;
  start: number;
  end: number;
}
