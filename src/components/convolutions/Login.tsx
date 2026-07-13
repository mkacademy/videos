import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authenticate } from '../../library/Thunks';
import { resolveLoginLoadingRedirectUrl } from '../../library/hydrationUtils';
import { initializedLoading } from '../../store/slices/sessionSlice';
import { AppDispatch, RootState } from '../../store';
import { convolutionDelay, convolutionTake, globalVars, sessionSizes } from '../../utils';
import * as styles from '../../styles/course.module.css';
import * as registrationStyles from '../../styles/registration.module.css';
import { CourseGlobal } from '../views/wrappers/courseGlobal';

const Login: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirectUrl') ?? '/';
  const authenticated = useSelector((state: RootState) => state.session.authenticated);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [seconds, setSeconds] = useState('7200');
  const [selectedRole, setSelectedRole] = useState('ROLE_USER');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const resultAction = await dispatch(authenticate({
        email,
        password,
        seconds: Number(seconds),
        selectedRole,
        ingredients: {},
      }));
      if (authenticate.fulfilled.match(resultAction)) {
        dispatch(initializedLoading(resultAction.payload));
        const target = resolveLoginLoadingRedirectUrl(redirectUrl);
        redirectTimerRef.current = setTimeout(() => {
          redirectTimerRef.current = null;
          navigate(target, { replace: true });
        }, convolutionDelay);
      } else {
        setError((resultAction.payload as string) ?? 'Login failed');
        setSubmitting(false);
      }
    } catch (err) {
      setError(typeof err === 'string' ? err : 'Login failed');
      setSubmitting(false);
    }
  };

  const handleIncognito = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!authenticated) {
      dispatch(initializedLoading({
        isIncognito: true,
        authenticated: false,
        roleIndex: -1,
        curToken: null,
        isPrivate: false,
        parentData: undefined,
        defaultTake: convolutionTake(),
      }));
    }
    navigate(resolveLoginLoadingRedirectUrl(redirectUrl), { replace: true });
  };

  return (
    <CourseGlobal>
      <div className={`course ${styles['course']}`}>
        <section className={`row mt-30 registration ${registrationStyles['registration']} ${styles['mt-30']}`}>
          <div className={`col-lg-12 form-header ${registrationStyles['form-header']} pl-5 pr-5`}>
            <div className={`container-inner-h2 ${registrationStyles['container-inner-h2']}`}>
              <h2 className={`text-color-white ${styles['text-color-white']}`}>MKACADEMY</h2>
            </div>
          </div>
          <div className="col-lg-12 pl-2 pl-sm-3 pl-md-5 pr-2 pr-sm-3 pr-md-5">
            <form
              className={`row container-inner contact-form ${registrationStyles['container-inner']} ${registrationStyles['contact-form']}`}
              onSubmit={handleSubmit}
            >
              <div className="col-xs-12 col-sm-12 col-md-6 col-lg-6 col-xl-6">
                <div className={`form-group ${registrationStyles['form-group']}`}>
                  <input
                    type="text"
                    className={`form-control ${registrationStyles['form-control']}`}
                    placeholder="Username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
                <div className={`form-group ${registrationStyles['form-group']}`}>
                  <input
                    type="password"
                    className={`form-control ${registrationStyles['form-control']}`}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <div className="col-xs-12 col-sm-12 col-md-6 col-lg-6 col-xl-6">
                <div className={`form-group ${registrationStyles['form-group']}`}>
                  <select
                    className={`form-control ${registrationStyles['form-control']}`}
                    value={seconds}
                    onChange={(e) => setSeconds(e.target.value)}
                    required
                  >
                    {Object.entries(sessionSizes).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={`form-group ${registrationStyles['form-group']}`}>
                  <select
                    className={`form-control ${registrationStyles['form-control']}`}
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    required
                  >
                    <option value="">Role</option>
                    <option value="ROLE_USER">Member</option>
                    <option value="ROLE_MODERATOR">Moderator</option>
                    <option value="ROLE_ADMIN">Administrator</option>
                  </select>
                </div>
              </div>
              {error && (
                <div className="col-12">
                  <p className="text-danger mb-0">{error}</p>
                </div>
              )}
              <div className={`col-xs-12 mt-4 center ${styles['center']}`}>
                <button
                  type="submit"
                  className={`btn btn-primary ${styles['btn']} ${styles['btn-primary']}`}
                  disabled={submitting}
                >
                  {submitting ? 'Signing in…' : 'LOGIN'}
                </button>
              </div>
              <div className={`col-xs-12 mt-1 center ${styles['center']}`}>
                <Link
                  to="#"
                  className={`text-color-gray ${styles['text-color-gray']}`}
                  onClick={handleIncognito}
                >
                  {authenticated
                    ? globalVars.ingredients
                      ? 'redirecting...'
                      : 'resume session'
                    : 'continue incognito'}
                </Link>
              </div>
            </form>
          </div>
          <div className={`col-lg-12 bg-color-gray text-color-white font-thin form-footer ${styles['bg-color-gray']} ${styles['text-color-white']} ${styles['font-thin']} ${registrationStyles['form-footer']}`} />
        </section>
        <div className="row">
          <div className="col-lg-12">
            <p className={`text-center small copyright-text ${registrationStyles['copyright-text']} ${styles['center']} mb-0`}>
              Copyright&nbsp;&copy;&nbsp;
              <span className="current-year">2024</span>
              &nbsp;MKACADEMY | Authored by&nbsp;
              <a
                href="https://linkedin.com/in/rugero-fabris-512499134"
                className={`text-color-gray ${styles['text-color-gray']}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Rugero Fabris
              </a>
            </p>
          </div>
        </div>
      </div>
    </CourseGlobal>
  );
};

export default Login;
