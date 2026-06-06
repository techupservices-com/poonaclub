import { generateId, normalizeMobile } from "@/lib/utils";
import { computeVerification } from "@/lib/verification";
import type {
  AuditLog,
  MemberDocument,
  MemberProfile,
  MemberWithVerification,
  MobileChangeRequest,
} from "@/lib/types";

interface MockState {
  members: MemberProfile[];
  documents: MemberDocument[];
  mobileChanges: MobileChangeRequest[];
  audits: AuditLog[];
}

declare global {
  var __POONA_MOCK_STATE__: MockState | undefined;
}

function createInitialState(): MockState {
  const members: MemberProfile[] = [
    {
      id: "member_1",
      membershipId: "T295",
      prefix: "Mr.",
      fullName: "Trilok Thadani",
      memberType: "New Permanent Member",
      status: "Active",
      email: "thadanitrilok@gmail.com",
      emailVerified: true,
      currentMobile: "9604420719",
      mobileVerified: true,
      dateOfBirth: "1982-09-14",
      joinedAt: "2021-04-07",
      city: "Pune",
      pincode: "411001",
      address1: "B-502 Le Mirage",
      address2: "16 Boat Club Road",
      address3: "Camp",
      role: "member",
    },
    {
      id: "member_2",
      membershipId: "T295A",
      prefix: "Mrs.",
      fullName: "Anita Thadani",
      memberType: "Family Member",
      status: "Pending Verification",
      email: "anita.thadani@example.com",
      emailVerified: false,
      currentMobile: "9604420719",
      mobileVerified: false,
      dateOfBirth: "1985-03-08",
      joinedAt: "2021-04-07",
      city: "Pune",
      pincode: "411001",
      address1: "B-502 Le Mirage",
      address2: "16 Boat Club Road",
      address3: "Camp",
      role: "member",
    },
    {
      id: "member_3",
      membershipId: "T295B",
      prefix: "Ms.",
      fullName: "Rhea Thadani",
      memberType: "Family Member",
      status: "Pending Verification",
      email: "rhea.thadani@example.com",
      emailVerified: false,
      currentMobile: "9604420719",
      mobileVerified: false,
      dateOfBirth: "2007-01-18",
      joinedAt: "2021-04-07",
      city: "Pune",
      pincode: "411001",
      address1: "B-502 Le Mirage",
      address2: "16 Boat Club Road",
      address3: "Camp",
      role: "member",
    },
    {
      id: "member_4",
      membershipId: "G359",
      prefix: "Mr.",
      fullName: "Gaurav Gadhoke",
      memberType: "Permanent Member",
      status: "Active",
      email: "gadhokegaurav@gmail.com",
      emailVerified: true,
      currentMobile: "9822040097",
      mobileVerified: true,
      dateOfBirth: "1983-06-09",
      joinedAt: "2006-05-12",
      city: "Pune",
      pincode: "411040",
      address1: "A-26 Padma Vilas Enclave",
      address2: "Near Shinde Chhatri Road",
      address3: "Wanowrie",
      role: "member",
    },
    {
      id: "member_5",
      membershipId: "G359A",
      prefix: "Mrs.",
      fullName: "Mitali Gadhoke",
      memberType: "Family Member",
      status: "Pending Verification",
      email: "mitali.gadhoke@example.com",
      emailVerified: false,
      currentMobile: "9822040097",
      mobileVerified: false,
      dateOfBirth: "1986-11-02",
      joinedAt: "2006-05-12",
      city: "Pune",
      pincode: "411040",
      address1: "A-26 Padma Vilas Enclave",
      address2: "Near Shinde Chhatri Road",
      address3: "Wanowrie",
      role: "member",
    },
    {
      id: "member_6",
      membershipId: "S699",
      prefix: "Mr.",
      fullName: "Kunal Sanghvi",
      memberType: "Permanent Member",
      status: "Active",
      email: "sanghvigrouppune@gmail.com",
      emailVerified: true,
      currentMobile: "9890033308",
      mobileVerified: true,
      dateOfBirth: "1980-08-24",
      joinedAt: "2001-08-02",
      city: "Pune",
      pincode: "411005",
      address1: "Sanghvi Bunglow 1343",
      address2: "Behind Mangala Theatre",
      address3: "Shivaji Nagar",
      role: "member",
    },
    {
      id: "member_7",
      membershipId: "S468",
      prefix: "Mr.",
      fullName: "Pankaj Shah",
      memberType: "Life Member Sr Citizen",
      status: "Active",
      email: "s_pankaj22@hotmail.com",
      emailVerified: false,
      currentMobile: "9822246742",
      mobileVerified: false,
      dateOfBirth: "1964-05-15",
      joinedAt: "1993-09-18",
      city: "Pune",
      pincode: "411037",
      address1: "10 Pitale Nagar Society",
      address2: "Behind Chandrakant Garage",
      address3: "Market Yard",
      role: "member",
    },
  ];

  const documents: MemberDocument[] = [
    {
      id: "doc_1",
      profileId: "member_1",
      documentType: "selfie",
      documentGroup: "selfie",
      documentPart: "selfie",
      fileName: "trilok-selfie.jpg",
      filePath: "mock/member_1/selfie.jpg",
      mimeType: "image/jpeg",
      uploadedAt: new Date().toISOString(),
    },
    {
      id: "doc_2",
      profileId: "member_1",
      documentType: "document",
      documentGroup: "legacy",
      documentPart: "legacy",
      fileName: "trilok-passport.pdf",
      filePath: "mock/member_1/passport.pdf",
      mimeType: "application/pdf",
      uploadedAt: new Date().toISOString(),
    },
    {
      id: "doc_3",
      profileId: "member_4",
      documentType: "selfie",
      documentGroup: "selfie",
      documentPart: "selfie",
      fileName: "gaurav-selfie.jpg",
      filePath: "mock/member_4/selfie.jpg",
      mimeType: "image/jpeg",
      uploadedAt: new Date().toISOString(),
    },
  ];

  return {
    members,
    documents,
    mobileChanges: [],
    audits: [],
  };
}

function getState() {
  if (!globalThis.__POONA_MOCK_STATE__) {
    globalThis.__POONA_MOCK_STATE__ = createInitialState();
  }

  return globalThis.__POONA_MOCK_STATE__;
}

export function listMembers() {
  return getState().members;
}

export function listMembersWithVerification(): MemberWithVerification[] {
  const state = getState();
  return state.members.map((member) => {
    const linkedMemberCount = state.members.filter(
      (candidate) => normalizeMobile(candidate.currentMobile) === normalizeMobile(member.currentMobile),
    ).length;

    return {
      ...member,
      linkedMemberCount,
      verification: computeVerification(
        member,
        state.documents.filter((document) => document.profileId === member.id),
      ),
    };
  });
}

export function getMemberById(id: string) {
  return listMembersWithVerification().find((member) => member.id === id) ?? null;
}

export function findMemberByIdentifier(identifier: string) {
  const value = identifier.trim().toLowerCase();
  const normalized = normalizeMobile(identifier);

  return (
    getState().members.find(
      (member) =>
        member.membershipId.toLowerCase() === value || normalizeMobile(member.currentMobile) === normalized,
    ) ?? null
  );
}

export function getLinkedMembers(profileId: string) {
  const current = getState().members.find((member) => member.id === profileId);
  if (!current) return [];
  return listMembersWithVerification().filter(
    (member) => normalizeMobile(member.currentMobile) === normalizeMobile(current.currentMobile),
  );
}

export function updateMember(profileId: string, updates: Partial<MemberProfile>) {
  const state = getState();
  const index = state.members.findIndex((member) => member.id === profileId);
  if (index === -1) return null;

  state.members[index] = {
    ...state.members[index],
    ...updates,
    currentMobile: updates.currentMobile
      ? normalizeMobile(updates.currentMobile)
      : state.members[index].currentMobile,
  };

  return getMemberById(profileId);
}

export function addDocument(
  profileId: string,
  documentType: "selfie" | "document",
  fileName: string,
  mimeType: string,
) {
  const state = getState();
  const existingIndex = state.documents.findIndex(
    (document) => document.profileId === profileId && document.documentType === documentType,
  );
  const nextDoc: MemberDocument = {
    id: generateId("doc"),
    profileId,
    documentType,
    documentGroup: documentType === "selfie" ? "selfie" : "legacy",
    documentPart: documentType === "selfie" ? "selfie" : "legacy",
    fileName,
    filePath: `mock/${profileId}/${documentType}/${fileName}`,
    mimeType,
    uploadedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    state.documents[existingIndex] = nextDoc;
  } else {
    state.documents.push(nextDoc);
  }

  return nextDoc;
}

export function listDocuments(profileId: string) {
  return getState().documents.filter((document) => document.profileId === profileId);
}

export function createMobileChangeRequest(input: Omit<MobileChangeRequest, "id" | "createdAt">) {
  const state = getState();
  const request: MobileChangeRequest = {
    ...input,
    id: generateId("mcr"),
    createdAt: new Date().toISOString(),
  };
  state.mobileChanges.push(request);
  return request;
}

export function getMobileChangeRequest(id: string) {
  return getState().mobileChanges.find((request) => request.id === id) ?? null;
}

export function completeMobileChangeRequest(id: string) {
  const state = getState();
  const request = state.mobileChanges.find((entry) => entry.id === id);
  if (!request) return null;
  request.status = "verified";
  request.verifiedAt = new Date().toISOString();
  updateMember(request.profileId, {
    currentMobile: request.newMobile,
    mobileVerified: true,
    status: "Active",
  });
  return request;
}

export function listAuditLogs() {
  return getState().audits;
}

export function addAuditLog(log: Omit<AuditLog, "id" | "createdAt">) {
  const state = getState();
  state.audits.unshift({
    ...log,
    id: generateId("audit"),
    createdAt: new Date().toISOString(),
  });
}
