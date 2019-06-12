import { Get, Post, Body, Put, Delete, Param, Controller, UsePipes, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { UserService } from './user.service';
import { UserEntity } from './user.entity';
import { UserRO } from './user.interface';
import { CreateUserDto, UpdateUserDto, LoginUserDto } from './dto';
import { HttpException } from '@nestjs/common/exceptions/http.exception';
import { User } from './user.decorator';
import { ValidationPipe } from '../shared/pipes/validation.pipe';

import {
  ApiUseTags,
  ApiBearerAuth,
  ApiOperation,
  ApiImplicitBody,
  ApiImplicitParam
} from '@nestjs/swagger';

@ApiUseTags('user')
@Controller()
export class UserController {

  constructor(private readonly userService: UserService) {}

  // @Put('user')
  // async update(@User('id') userId: number, @Body('user') userData: UpdateUserDto) {
  //   return await this.userService.update(userId, userData);
  // }

  @ApiOperation({ title: 'Sign-up new user' })
  @UsePipes(new ValidationPipe())
  // @ApiImplicitBody({ name: 'CreateUserDto', type: CreateUserDto})
  @Post('user')
  async create(@Body() userData: CreateUserDto) {
    return this.userService.create(userData);
  }

  @ApiOperation({ title: 'Log in existing user' })
  @UsePipes(new ValidationPipe())
  @Post('user/login')
  async login(@Body() loginUserDto: LoginUserDto): Promise<UserRO> {
    const _user = await this.userService.findOne(loginUserDto);

    if (!_user) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const token = await this.userService.generateJWT(_user);
    const { email, username, role, countryId } = _user;
    const user = {
      email,
      token,
      username,
      role,
      countryId,
    };

    return { user }
  }

  @ApiBearerAuth()
  @ApiOperation({ title: 'Delete user by userId' })
  @Delete('user/:userId')
  @ApiImplicitParam({name: 'userId', required: true, type: 'string'})
  async delete(@Param() params) {
    return await this.userService.delete(params.userId);
  }

  @ApiBearerAuth()
  @ApiOperation({ title: 'Get current user' })
  @Get('user')
  async findMe(@User('email') email: string): Promise<UserRO> {
    return await this.userService.findByEmail(email);
  }
}
