import { TIMEOUT_USER } from '../../constants/constants';
export const isExistingUser = () => {
    return (setTimeout(() => {
        console.log('USER');
    }, TIMEOUT_USER));
};
