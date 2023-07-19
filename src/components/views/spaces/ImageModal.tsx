/* eslint-disable matrix-org/require-copyright-header */
import React from 'react';

interface Props {
    imageSrc: string;
    onClose: () => void;
}

const ImageModal: React.FC<Props> = ({ imageSrc, onClose }) => {
    return (
        <div className='mx_imagemodal' onClick={onClose}>
            <img
                src={imageSrc}
                className='mx_imagemodal__image'
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
};

export default ImageModal;
