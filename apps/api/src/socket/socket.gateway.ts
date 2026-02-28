import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/types';

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

@WebSocketGateway({
  cors: {
    origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SocketGateway.name);

  constructor(private readonly prisma: PrismaService) { }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from auth payload or query string
      const token = client.handshake.auth?.token || client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Client disconnected (No token). ID: ${client.id}`);
        client.disconnect();
        return;
      }

      // Verify JWT using NEXTAUTH_SECRET (which Clerk/NextAuth uses)
      const secret = process.env.NEXTAUTH_SECRET || 'super-secret';
      const decoded = jwt.verify(token as string, secret) as JwtPayload;

      // Attach the decoded user payload to the socket
      client.user = decoded;
      this.logger.log(`Client connected and authenticated: ${client.id} (User: ${decoded.sub})`);
    } catch (error) {
      this.logger.warn(`Client disconnected (Invalid token). ID: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-production')
  async handleJoinProduction(
    @MessageBody() data: { productionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!data?.productionId || !client.user) return;

    try {
      // Verify user is actually a member of this production before allowing them to listen
      const member = await this.prisma.productionMember.findUnique({
        where: {
          productionId_userId: {
            productionId: data.productionId,
            userId: client.user.sub,
          },
        },
      });

      if (!member) {
        this.logger.warn(`Client ${client.id} denied access to room ${data.productionId}`);
        return;
      }

      client.join(data.productionId);
      this.logger.log(`Client ${client.id} joined room: ${data.productionId}`);
    } catch (error) {
      this.logger.error(`Error verifying membership for socket ${client.id}:`, error);
    }
  }

  @SubscribeMessage('leave-production')
  handleLeaveProduction(
    @MessageBody() data: { productionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (data?.productionId) {
      client.leave(data.productionId);
      this.logger.log(`Client ${client.id} left room: ${data.productionId}`);
    }
  }
}
