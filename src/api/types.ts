export type LinkDirection = 'OUTWARD' | 'INWARD' | 'BOTH';

export interface IssueLinkDto {
  direction: LinkDirection;
  linkType: { name: string };
  issues: { idReadable: string }[];
}

export interface CustomFieldDto {
  name: string;
  value: unknown;
}

export interface IssueDto {
  idReadable: string;
  summary: string;
  resolved: number | null;
  project: { shortName: string };
  customFields: CustomFieldDto[];
  links: IssueLinkDto[];
}

export interface MeDto {
  login: string;
  fullName: string;
}
