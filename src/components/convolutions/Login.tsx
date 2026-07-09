import LoginWrapper from '../views/LoginWrapper';
import * as styles from '../../styles/course.module.css';
import * as registrationStyles from '../../styles/registration.module.css';
import { CourseGlobal } from '../views/wrappers/courseGlobal';

const styleProps = {
  'registration': registrationStyles["registration"],
  'form-header': registrationStyles['form-header'],
  'container-inner-h2': registrationStyles['container-inner-h2'],
  'container-inner': registrationStyles['container-inner'],
  'contact-form': registrationStyles['contact-form'],
  'mt-30': styles['mt-30'],
  'text-color-white': styles['text-color-white'],
  'text-color-gray': styles['text-color-gray'],
  'bg-color-gray': styles['bg-color-gray'],
  'font-thin': styles['font-thin'],
  'check-box-group': registrationStyles['check-box-group'],
  'center': styles["center"],
  'form-control': registrationStyles['form-control'],
  'form-footer': registrationStyles['form-footer'],
  'btn': styles["btn"],
  'btn-primary': styles['btn-primary'],
  'no-Padding-right': registrationStyles['no-Padding-right'],
  'no-Padding-left': registrationStyles['no-Padding-left'],
  'form-group': registrationStyles['form-group']
};

const Login = () => {
  return (
    <CourseGlobal>
      <div className={`course ${styles["course"]}`}>
        <LoginWrapper styles={styleProps} />
        <div className="row">
          <div className="col-lg-12">
            <p className={`text-center small copyright-text ${registrationStyles['copyright-text']} ${styles["center"]} mb-0`}>
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