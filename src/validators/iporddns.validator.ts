/**
 * class-methods-use-this disabled as it isn't compatible with class-validators recommended approach for custom validation:
 * https://github.com/typestack/class-validator?tab=readme-ov-file#custom-validation-classes
 */
/* eslint-disable class-methods-use-this  */
import {
  isIP,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsIPOrDDNS', async: false })
export class IsIPOrDDNS implements ValidatorConstraintInterface {
  validate(text: string) {
    if (text === 'DDNS') return true;
    return isIP(text);
  }

  defaultMessage() {
    return 'Text should be "DDNS" or an ipV4 or V6 address';
  }
}
