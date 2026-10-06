import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SignUpDto } from './sign-up.dto.js';

describe('SignUpDto', () => {
  it('normalizes the email and accepts a region', async () => {
    const dto = plainToInstance(SignUpDto, {
      email: ' Learner@Example.com ',
      password: 'correct horse battery',
      region: ' South ',
    });

    expect(dto.email).toBe('learner@example.com');
    expect(dto.region).toBe('South');
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects short passwords and an attempt to set the role', async () => {
    const dto = plainToInstance(SignUpDto, {
      email: 'learner@example.com',
      password: 'short',
      role: 'admin',
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['password', 'role']),
    );
  });

  it('requires a region for the default manager account', async () => {
    const dto = plainToInstance(SignUpDto, {
      email: 'learner@example.com',
      password: 'correct horse battery',
    });

    const errors = await validate(dto);

    expect(errors.map(({ property }) => property)).toContain('region');
  });

  it('rejects passwords exceeding bcrypt’s byte limit', async () => {
    const dto = plainToInstance(SignUpDto, {
      email: 'learner@example.com',
      password: 'é'.repeat(37),
    });

    const errors = await validate(dto);

    expect(errors.map(({ property }) => property)).toContain('password');
  });
});
