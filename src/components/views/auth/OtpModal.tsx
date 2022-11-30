/* eslint-disable matrix-org/require-copyright-header */
import React, { FormEvent, useState } from 'react';

interface Props {
    onSend: (otp: string) => void;
    onClose: () => void;
}

const OtpModal: React.FC<Props> = ({ onSend, onClose }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [otp, setOtp] = useState(new Array(6));
    const otpLength = 6;

    const inputHandler = (value, index) => {
        const newOtp = otp;
        newOtp[index] = value;
        setOtp(newOtp);

        if (value.length && index + 1 !== otpLength) {
            document.getElementById(`input${index + 1}`).focus();
        } else if (index !== 0) {
            document.getElementById(`input${index - 1}`).focus();
        }
    };

    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        onSend(otp.join(''));
    };

    return (
        <div className='mx_otpmodal' onClick={onClose}>
            <div className='mx_otpmodal__content' onClick={(e) => e.stopPropagation()}>
                <form className="mx_otpmodal__form" onSubmit={onSubmit}>
                    <h1 className="mx_otpmodal__heading">
                        Подтверждение
                    </h1>
                    <p className="mx_otpmodal__description">
                        Введите код, который пришел вам на телефон
                    </p>
                    <div className="mx_otpmodal__inputs">
                        {
                            [...Array(otpLength)].map((e, i) => (
                                <input
                                    id={`input${i}`}
                                    type="tel"
                                    maxLength={1}
                                    className="mx_otpmodal__input"
                                    value={otp[i]}
                                    onChange={(e) => inputHandler(e.target.value, i)}
                                    key={i}
                                />
                            ))
                        }
                    </div>
                    <button type='submit' className="mx_otpmodal__submit mx_Login_submit">
                        Отправить
                    </button>
                </form>
            </div>
        </div>
    );
};

export default OtpModal;
