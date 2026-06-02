import {
    Injectable,
    ConflictException,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto): Promise<AuthResponseDto> {
        const emailLower = dto.email.toLowerCase();
        const existingUser = await this.prisma.user.findUnique({
            where: { email: emailLower },
        });

        if (existingUser) {
            throw new ConflictException('该邮箱已被注册');
        }

        if (dto.username) {
            const existingUsername = await this.prisma.user.findUnique({
                where: { username: dto.username },
            });
            if (existingUsername) {
                throw new ConflictException('该用户名已被使用');
            }
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);

        const user = await this.prisma.user.create({
            data: {
                email: emailLower,
                passwordHash,
                username: dto.username,
                displayName: dto.displayName || dto.username || dto.email.split('@')[0],
                settings: {
                    create: {},
                },
            },
            select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
                avatarPath: true,
                role: true,
                avatarPosition: true,
            },
        });

        const accessToken = await this.generateToken(user.id, user.email);

        this.logger.log(`用户注册成功: ${user.email}`);

        return {
            accessToken,
            user,
        };
    }

    async login(dto: LoginDto): Promise<AuthResponseDto> {
        const emailLower = dto.email.toLowerCase();
        const user = await this.prisma.user.findUnique({
            where: { email: emailLower },
            select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
                avatarPath: true,
                role: true,
                avatarPosition: true,
                passwordHash: true,
            },
        });

        if (!user) {
            throw new UnauthorizedException('邮箱或密码错误');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

        if (!isPasswordValid) {
            throw new UnauthorizedException('邮箱或密码错误');
        }

        const accessToken = await this.generateToken(user.id, user.email);

        this.logger.log(`用户登录成功: ${user.email}`);

        const { passwordHash: _, ...userWithoutPassword } = user;

        return {
            accessToken,
            user: userWithoutPassword,
        };
    }

    async validateUser(userId: number) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
                avatarPath: true,
                role: true,
                avatarPosition: true,
            },
        });
    }

    async getProfile(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
                avatarPath: true,
                role: true,
                avatarPosition: true,
                bio: true,
                createdAt: true,
                settings: true,
                _count: {
                    select: {
                        favoriteSongs: true,
                        favoriteAlbums: true,
                        followedArtists: true,
                        playlists: true,
                    },
                },
            },
        });

        if (!user) {
            throw new UnauthorizedException('用户不存在');
        }

        return user;
    }

    private async generateToken(userId: number, email: string): Promise<string> {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
        const payload = { sub: userId, email, role: user?.role || 'user' };
        return this.jwtService.sign(payload);
    }
}
