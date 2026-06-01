import { prisma } from '../database';
import { CreateUserDto, UpdateUserDto } from '../dtos/user.dto';

export class UserRepository {
  async findAll() {
    return await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(id: string) {
    return await prisma.user.findUnique({
      where: { id }
    });
  }

  async findByUsername(username: string) {
    return await prisma.user.findUnique({
      where: { username }
    });
  }

  async findByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email }
    });
  }

  async create(data: CreateUserDto & { id: string; passwordHash: string }) {
    return await prisma.user.create({
      data: {
        id: data.id,
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        role: data.role || 'operator',
        passwordHash: data.passwordHash,
        createdAt: new Date()
      }
    });
  }

  async update(id: string, data: UpdateUserDto & { passwordHash?: string }) {
    return await prisma.user.update({
      where: { id },
      data: {
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        passwordHash: data.passwordHash
      }
    });
  }

  async delete(id: string) {
    return await prisma.user.delete({
      where: { id }
    });
  }
}
