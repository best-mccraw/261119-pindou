import { Pattern } from '../core/pattern';
// 仅内存传递，不保存用户原图或跨会话保留资格。
export const session: {
    pattern?: Pattern;
} = {};
