import { useState } from "react";
import { Button, Form, Input } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { useAuth } from "../auth";
import { BrandMark } from "./Brand";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface Values {
  email: string;
  password: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm<Values>();

  const submit = async ({ email, password }: Values) => {
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-corner">
        <ThemeSwitcher />
      </div>
      <div className="login-card">
        <div className="brand brand-lg">
          <BrandMark size={28} />
          <span>Priority matrix</span>
        </div>
        <h1>Welcome back</h1>
        <p className="login-sub">Sign in to see your tasks.</p>
        <Form<Values> form={form} layout="vertical" requiredMark={false} onFinish={submit} size="large" validateTrigger="onSubmit">
          <Form.Item name="email" label="Email" rules={[{ required: true, message: "Enter your email" }]}>
            <Input
              autoFocus
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              prefix={<MailOutlined />}
              onChange={() => setError(null)}
              onPressEnter={() => form.submit()}
            />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, message: "Enter your password" }]}>
            <Input.Password
              autoComplete="current-password"
              placeholder="Your password"
              prefix={<LockOutlined />}
              onChange={() => setError(null)}
              onPressEnter={() => form.submit()}
            />
          </Form.Item>
          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}
          <Button type="primary" htmlType="submit" block loading={busy} size="large" className="login-submit">
            Sign in
          </Button>
        </Form>
        <p className="login-foot">
          No account? Ask your administrator to run <code>npm run add-user</code>.
        </p>
      </div>
    </div>
  );
}
