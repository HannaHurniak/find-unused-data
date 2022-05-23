import React from 'react';
import { TIMEOUT, TIMEOUT_COMMENTS, TIMEOUT_USER } from '../../constants/constants';
import { d } from '../all/all';


export const isExistingUser = () => {
    return (
        setTimeout(() => {
            console.log('USER');
        }, TIMEOUT_USER)
    )
}

export const User = () => {
    return(
        <div>User</div>
    )
}