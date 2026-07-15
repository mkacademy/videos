
export interface CustomJwtPayload {
    sub: string;
    quota: number;
    userid: number;
    roles: string[];
    roleIds: number[];
}

export interface AuthPayload {
    email: string;
    seconds: number;
    password: string;
    selectedRole: string;
}



