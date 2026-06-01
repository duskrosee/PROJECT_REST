export interface CreateUserDto {
  username: string;
  password?: string;
  email: string;
  fullName: string;
  isAdmin?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  fullName?: string;
  isAdmin?: boolean;
  password?: string;
}
