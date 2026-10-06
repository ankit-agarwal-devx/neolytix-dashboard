export interface LoginResponseDto {
  accessToken: string;
  user: {
    id: number;
    email: string;
    role: string;
    region: string | null;
  };
}
