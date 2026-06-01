import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository';
import { AuditLogRepository } from '../repositories/audit.repository';
import { CreateUserDto, UpdateUserDto } from '../dtos/user.dto';

const JWT_SECRET = process.env.JWT_SECRET || 'FUEL_STATION_MGMT_SECRET_KEY_2026';

export class UserService {
  private userRepo = new UserRepository();
  private auditRepo = new AuditLogRepository();

  async login(username: string, password?: string) {
    if (!username || !password) {
      throw new Error('Nazwa użytkownika i hasło są wymagane.');
    }

    const user = await this.userRepo.findByUsername(username);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      throw new Error('Błędny login lub hasło');
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, isAdmin: user.isAdmin },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    const roleLabel = user.isAdmin ? 'administrator' : 'użytkownik';
    await this.auditRepo.create(user.username, 'LOGIN', `Zalogowano pomyślnie. Typ konta: ${roleLabel}`);

    const { passwordHash, ...cleanUser } = user;
    return { token, user: cleanUser };
  }

  async getAllUsers() {
    const users = await this.userRepo.findAll();
    return users.map(({ passwordHash, ...u }) => u);
  }

  async getUserById(id: string) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new Error('Użytkownik nie został znaleziony');
    }
    const { passwordHash, ...cleanUser } = user;
    return cleanUser;
  }

  async createUser(dto: CreateUserDto) {
    if (!dto.username || !dto.password || !dto.email || !dto.fullName) {
      throw new Error('Błąd walidacji: Pola username, password, email i fullName są wymagane');
    }

    if (dto.password.length < 6) {
      throw new Error('Błąd walidacji: Hasło musi posiadać co najmniej 6 znaków');
    }

    const existingUser = await this.userRepo.findByUsername(dto.username);
    if (existingUser) {
      throw new Error('Użytkownik o takim loginie już istnieje');
    }

    const existingEmail = await this.userRepo.findByEmail(dto.email);
    if (existingEmail) {
      throw new Error('Użytkownik o takim adresie e-mail już istnieje');
    }

    const id = 'usr_' + Math.random().toString(36).substring(2, 11);
    const passwordHash = bcrypt.hashSync(dto.password, 10);
    const isAdmin = dto.isAdmin ?? false;

    const created = await this.userRepo.create({
      id,
      username: dto.username,
      email: dto.email,
      fullName: dto.fullName,
      isAdmin,
      passwordHash
    });

    const roleLabel = isAdmin ? 'administrator' : 'użytkownik';
    await this.auditRepo.create('SYSTEM', 'USER_REGISTRATION', `Zarejestrowano użytkownika ${dto.username} (${roleLabel})`);

    const { passwordHash: _, ...cleanUser } = created;
    return cleanUser;
  }

  async updateUser(id: string, dto: UpdateUserDto, actorUsername: string) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new Error('Użytkownik o podanym ID nie istnieje');
    }

    if (dto.email && dto.email !== user.email) {
      const emailOccupied = await this.userRepo.findByEmail(dto.email);
      if (emailOccupied) {
        throw new Error('Adres e-mail jest już zajęty');
      }
    }

    let passwordHash: string | undefined;
    if (dto.password) {
      if (dto.password.length < 6) {
        throw new Error('Hasło musi zawierać co najmniej 6 znaków');
      }
      passwordHash = bcrypt.hashSync(dto.password, 10);
    }

    const updated = await this.userRepo.update(id, {
      ...dto,
      passwordHash
    });

    await this.auditRepo.create(actorUsername, 'USER_UPDATE', `Zaktualizowano profil użytkownika o ID: ${id}`);

    const { passwordHash: _, ...cleanUser } = updated;
    return cleanUser;
  }

  async deleteUser(id: string, actorUsername: string) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new Error('Użytkownik nie istnieje');
    }

    const deletedUsername = user.username;
    await this.userRepo.delete(id);

    await this.auditRepo.create(actorUsername, 'USER_DELETE', `Usunięto konto użytkownika ${deletedUsername}`);
    return true;
  }
}
