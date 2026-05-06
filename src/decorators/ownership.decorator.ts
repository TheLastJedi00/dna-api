import { createParamDecorator, ExecutionContext, SetMetadata, UnauthorizedException } from '@nestjs/common';

export const Ownership = createParamDecorator((data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.auth
    if(!user){
        throw new UnauthorizedException("Usuário não logado")
    }

    if(!data){
        return user;
    }
    return user ? user[data] : null
})