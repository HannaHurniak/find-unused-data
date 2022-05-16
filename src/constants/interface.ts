export interface CardInfoNewCard {
  title: string;
  description: string;
}

export interface CodeWorkspaceProps {
  codeReview: string;
  setCodeReview: (value: string) => void;
  toggleModal: () => void;
}

export interface LoaderProps {
  className: string;
  width?: string;
}

export interface SidebarProps {
  isOpened: boolean;
  onClose: () => void;
}

export interface Comment {
  lineRange: number[];
  content: string;
  id: string;
}

export interface ConnectionIdData {
  A: string;
  B: string;
}

export enum VIDEO_SOURCES {
  YOU_TUBE = "youtube",
  GOOGLE_DRIVE = "googleDrive",
}

export type LineNumbersType = 'on' | 'off' | 'relative' | 'interval' | ((lineNumber: number) => string);