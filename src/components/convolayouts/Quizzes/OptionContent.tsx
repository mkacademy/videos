/**
 * OptionContent – Memoized option display for quiz questions (text or image)
 *
 * WHY THIS COMPONENT EXISTS
 * -------------------------
 * Quiz options can show either text or an image. We needed a way to display
 * these without large images flickering every time the user clicked a radio
 * button. This component, plus the compositing-layer wrapper, solves that.
 *
 * ISSUES WE FACED (for future reference)
 * -------------------------------------
 *
 * 1. Re-renders on every radio click
 *    - Originally we used react-hook-form (useForm + register). The form
 *      subscribes to field changes, so changing a radio caused the whole
 *      Question to re-render. That was acceptable, but it triggered the
 *      next issues.
 *
 * 2. Unnecessary re-renders from parent (Screen)
 *    - Question receives `attempt` from Screen. Screen passes
 *      `attempt[\`choice${slide.id}\`]` (an object). Redux/selectors often
 *      return new object references, so that prop was a new reference on
 *      every parent render. React’s shallow compare saw “changed props” and
 *      re-rendered Question even when the actual value for that question
 *      hadn’t changed.
 *    - Fix: In Screen we added QuestionWithStableAttempt, which memoizes
 *      the attempt prop using the primitive value (attemptValue) so the
 *      reference only changes when that question’s answer actually changes.
 *      We also wrapped Question in React.memo.
 *
 * 3. Image flicker even when OptionContent did NOT re-render
 *    - We wrapped the option’s text/image in React.memo(OptionContent). The
 *      props (hasImage, imageUrl, textValue, placeholder) don’t change on
 *      radio click, so OptionContent did not re-render (verified with
 *      console.log). The image still flickered.
 *    - Cause: The flicker was from the browser repainting, not from React
 *      re-rendering. When the user clicks a radio, the label re-renders;
 *      the radio and checkmark DOM/styles update. The browser repaints the
 *      label. By default the whole label (including the image) is one paint
 *      region, so the image was repainted too → visible flicker on large
 *      images.
 *
 * 4. Fix for image flicker: compositing layer
 *    - We wrap the image in a span with a class that promotes it to its own
 *      compositing layer (e.g. transform: translateZ(0), backface-visibility:
 *      hidden, contain: paint). That class is passed in as imageWrapperClassName
 *      (e.g. optionImageLayer from quiz.module.css). With its own layer, the
 *      image is no longer repainted when the radio/checkmark update.
 *
 * USAGE
 * -----
 * Use for each quiz option’s content (text or image). Pass stable props
 * (hasImage, imageUrl, textValue, placeholder) and optionally
 * imageWrapperClassName for the image wrapper so the image gets the
 * compositing-layer styles. Parent must apply the CSS class (e.g.
 * .optionImageLayer in quiz.module.css) that uses transform/contain to
 * create the layer.
 */

import React from 'react';
import LinkifiedText from '../../LinkifiedText';
import { textEllipsis } from '../../../utils';
import { isImageDataUrlOrPlaceholder } from '../../views/Instruction';

export interface OptionContentProps {
  hasImage: boolean;
  imageUrl: string;
  textValue: string;
  placeholder: string;
  imageWrapperClassName?: string;
}

const OptionContent = React.memo(function OptionContent(props: OptionContentProps) {
  const { imageUrl, textValue, placeholder, imageWrapperClassName } = props;
  if (!isImageDataUrlOrPlaceholder(textValue)) {
    return (
      <span>
        <LinkifiedText text={textEllipsis(textValue.toLowerCase(), 500)} />
      </span>
    );
  }
  return (
    <span className={imageWrapperClassName}>
      <img
        src={imageUrl}
        alt="placeholder"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = placeholder;
        }}
      />
    </span>
  );
});

export default OptionContent;
