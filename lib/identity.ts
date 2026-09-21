// Extension point: format/duplicate checks never imply official identity verification.
export interface IdentityProvider {
  verify(input: {
    dni: string;
    nombres: string;
    apellido_paterno: string;
    apellido_materno?: string;
  }): Promise<{
    status: "NOT_VERIFIED" | "VERIFIED" | "REJECTED";
    provider: string;
  }>;
}
export const selfDeclaredIdentity: IdentityProvider = {
  async verify() {
    return { status: "NOT_VERIFIED", provider: "SELF_DECLARED" };
  },
};
