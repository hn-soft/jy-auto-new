import random
import time
from typing import Literal

def mask_operate(target: str, op_type: Literal['add', 'remove']) -> str:
    """
    对激活码进行加密或解密
    """
    last_digit = int(target[-1])
    mask = 2 if last_digit % 2 == 0 else 4
    decoded = []
    
    for digit in target:
        num = int(digit)
        if op_type == 'add':
            decoded.append(str((num + mask) % 10))
        else:  # remove
            decoded.append(str((num + 10 - mask) % 10))
            
    return ''.join(decoded)

def get_expiration_from_product_code(product_code: str) -> int:
    """
    从产品码中获取到期时间戳
    """
    # 产品码的位9-18是到期时间戳
    return int(product_code[9:19])

def generate_activation_code(
    product_code: str,
    days_to_add: int,
    tier: Literal['basic', 'standard'] = 'basic',
    usage_multiplier: int = 1
) -> str:
    """
    生成激活码
    
    Args:
        product_code: 20位产品码，其中第6位(索引5)表示是否为已注册用户(0:新用户, 1:已注册用户)
        days_to_add: 需要添加的天数
        tier: 版本类型 'basic' 或 'standard'
        usage_multiplier: 使用次数倍数（0-9）
    
    Returns:
        str: 20位激活码
    """
    # 1. 验证产品码格式
    if len(product_code) != 20:
        raise ValueError('Product code must be 20 digits')
    
    if not (0 <= usage_multiplier <= 9):
        raise ValueError('Usage multiplier must be between 0 and 9')
    
    # 从产品码中获取是否为已注册用户
    is_renewal = product_code[5] == '1'
    
    # 计算新的到期时间
    current_time = int(time.time())
    if is_renewal:
        # 获取原有到期时间
        original_expiration = get_expiration_from_product_code(product_code)
        # 如果已过期，从当前时间开始计算
        # 如果未过期，从原有到期时间开始计算
        start_time = max(current_time, original_expiration)
        expiration_timestamp = start_time + (days_to_add * 24 * 60 * 60)
    else:
        # 新用户直接从当前时间开始计算
        expiration_timestamp = current_time + (days_to_add * 24 * 60 * 60)
    
    code = [0] * 20
    
    # 2. 前5位随机数字
    for i in range(5):
        code[i] = random.randint(0, 9)
    
    # 3. 第6位是产品码前10位的校验和
    sum1 = sum(int(product_code[i]) for i in range(10))
    code[5] = sum1 % 10
    
    # 4. 第7位是产品码后10位的校验和
    sum2 = sum(int(product_code[i]) for i in range(10, 20))
    code[6] = sum2 % 10
    
    # 5. 随机填充位7-8
    code[7] = random.randint(0, 9)
    code[8] = random.randint(0, 9)
    
    # 6. 时间戳 (位9-17)
    ts_str = str(expiration_timestamp).zfill(10)
    for i in range(9):
        code[i + 9] = int(ts_str[i])
    
    # 7. 位18: 使用次数倍数
    code[18] = usage_multiplier
    
    # 8. 位19: 版本类型和续费状态标记
    last_digit = 5 if tier == 'basic' else 0
    if is_renewal:
        last_digit += 1
    code[19] = last_digit
    
    # 9. 应用掩码
    raw_code = ''.join(map(str, code))
    return mask_operate(raw_code, 'add')

def generate_activation_code_example():
    """生成示例激活码"""
    # 新用户的产品码 (第6位是0)
    new_user_product_code = "12533020104803214001"
    
    # 创建一个未过期的续费用户产品码 (第6位是1，到期时间是30天后)
    future_expiration = int(time.time()) + (30 * 24 * 60 * 60)
    renewal_user_product_code = f"12533021{str(future_expiration).zfill(10)}001"
    
    # 创建一个已过期的续费用户产品码
    past_expiration = int(time.time()) - (30 * 24 * 60 * 60)  # 30天前
    expired_user_product_code = f"12533021{str(past_expiration).zfill(10)}001"
    
    # 生成basic版本的新用户激活码 (30天)
    new_user_code = generate_activation_code(
        new_user_product_code,
        days_to_add=30,
        tier='basic',
        usage_multiplier=2
    )
    
    # 生成未过期用户的续费激活码 (添加60天)
    active_renewal_code = generate_activation_code(
        renewal_user_product_code,
        days_to_add=60,
        tier='basic',
        usage_multiplier=2
    )
    
    # 生成已过期用户的续费激活码 (90天)
    expired_renewal_code = generate_activation_code(
        expired_user_product_code,
        days_to_add=90,
        tier='basic',
        usage_multiplier=2
    )
    
    # 生成永久版的standard版本激活码
    forever_code = generate_activation_code(
        new_user_product_code,
        days_to_add=36500,  # 约100年
        tier='standard',
        usage_multiplier=9
    )
    
    return {
        'new_user': new_user_code,
        'active_renewal': active_renewal_code,
        'expired_renewal': expired_renewal_code,
        'forever': forever_code
    }

def decode_activation_code(activation_code: str):
    """解码激活码并显示信息"""
    decrypted = mask_operate(activation_code, 'remove')
    
    # 解析信息
    expiration_timestamp = int(decrypted[9:19])
    expiration_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(expiration_timestamp))
    
    usage_multiplier = int(decrypted[18])
    last_digit = int(decrypted[19])
    
    tier = 'basic' if last_digit in [5, 6] else 'standard'
    is_renewal = last_digit in [1, 6]
    
    return {
        'decrypted_code': decrypted,
        'expiration_time': expiration_time,
        'tier': tier,
        'is_renewal': is_renewal,
        'usage_multiplier': usage_multiplier
    }

if __name__ == "__main__":
    codes = generate_activation_code_example()
    
    print("=== 新用户激活码 ===")
    print(f"激活码: {codes['new_user']}")
    print(decode_activation_code(codes['new_user']))
    
    print("\n=== 未过期续费用户激活码 ===")
    print(f"激活码: {codes['active_renewal']}")
    print(decode_activation_code(codes['active_renewal']))
    
    print("\n=== 已过期续费用户激活码 ===")
    print(f"激活码: {codes['expired_renewal']}")
    print(decode_activation_code(codes['expired_renewal']))
    
    print("\n=== 永久版激活码 ===")
    print(f"激活码: {codes['forever']}")
    print(decode_activation_code(codes['forever'])) 