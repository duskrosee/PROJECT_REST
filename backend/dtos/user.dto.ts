export interface CreateUserDto {
  username: string;
  password?: string;
  email: string;
  fullName: string;
  role?: 'admin' | 'manager' | 'operator';
}

export interface UpdateUserDto {
  email?: string;
  fullName?: string;
  role?: 'admin' | 'manager' | 'operator';
  password?: string;
}
