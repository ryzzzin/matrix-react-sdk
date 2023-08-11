/* eslint-disable matrix-org/require-copyright-header */
import { Room } from 'matrix-js-sdk/src/matrix';
import React, { useContext, useEffect, useState } from 'react';
import firebase from 'firebase';
import { v4 as uuidv4 } from 'uuid';

import MatrixClientContext from '../../../contexts/MatrixClientContext';
import RoomTileCustom from '../rooms/RoomTileCustom';

interface Props {
    onClose: () => void;
}

const CloudShareModal: React.FC<Props> = ({ onClose }) => {
    const matrixClient = useContext(MatrixClientContext);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        const newRooms = matrixClient.getRooms();
        setRooms(newRooms);
        console.log(rooms);
    }, [matrixClient]);

    async function uploadFileToFirebaseStorage(
        file: File,
        recipientID: string,
        senderID: string,
        senderName: string,
    ) {
        const storageRef = firebase.storage().ref();

        const fileName = `${uuidv4()}`;
        const fileExtension = file.name.split('.').pop();
        const filePath = `files/${recipientID}/pending/${fileName}.${fileExtension}`;
        const fileRef = storageRef.child(filePath);

        const contentType = file.type;
        const metadata = {
            contentType,
        };

        const uploadTask = fileRef.put(file, metadata);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress =
            snapshot.bytesTransferred / snapshot.totalBytes;
                // uploadProgress = progress;
                console.log('Progress', progress);
            },
            (error) => {
                console.log('TEST Error uploading file:', error);
            },
            () => {
                console.log('TEST File uploaded successfully!');
                createFirestoreCloudDocument(filePath, recipientID, senderID, senderName);
            },
        );

        try {
            await uploadTask;
        } catch (error) {
            console.log('TEST Error uploading file:', error);
        }
    }

    function createFirestoreCloudDocument(
        filePath: string,
        recipientID: string,
        senderID: string,
        senderName: string,
    ) {
        const defaultFirestore = firebase.firestore();
        const createdAt = firebase.firestore.FieldValue.serverTimestamp();
        console.log('🚀 - createdAt:', createdAt);

        const data = {
            filePath,
            recipientID,
            senderID,
            senderName,
            createdAt,
            status: "Pending",
        };
        console.log('🚀 - data:', data);

        defaultFirestore
            .collection('cloud')
            .add(data)
            .then((ref) => {
                console.log('TEST Document added successfully!');
                const documentID = ref.id;
                console.log('TEST Document ID:', documentID);
                onClose();
            })
            .catch((error) => {
                console.log('TEST Error adding document:', error);
            });
    }

    const roomClickHandler = async (room: Room, event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        event.stopPropagation();
        const senderID = room.myUserId;
        const myProfile = await matrixClient.getProfileInfo(senderID);
        const senderName = myProfile.displayname;
        const roomMembers = room.currentState.members;
        const membersList = Object.values(roomMembers).filter((member) => member.userId !== senderID);

        membersList.forEach((member) => {
            uploadFileToFirebaseStorage(selectedFile!, member.userId, senderID, senderName);
        });
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const selectedFile = files[0];
            setSelectedFile(selectedFile);
            console.log(selectedFile);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const files = event.dataTransfer.files;
        if (files && files.length > 0) {
            const selectedFile = files[0];
            setSelectedFile(selectedFile);
            console.log(selectedFile);
        }
    };

    return (
        <div className='mx_cloudsharemodal' onClick={onClose} onDragOver={handleDragOver} onDrop={handleDrop}>
            <div className='mx_cloudsharemodal__content' onClick={(e) => e.stopPropagation()}>
                <div className="mx_cloudsharemodal__header">
                    <h1 className="mx_cloudsharemodal__heading">Отправить файл в облако</h1>
                </div>
                <div className="mx_cloudsharemodal__main">
                    { !selectedFile ? (
                        <div className="mx_cloudsharemodal__form">
                            <label htmlFor="fileInput" className="mx_cloudsharemodal__fileLabel">
                                Выберите или перетащите файл
                            </label>
                            <input id="fileInput" type="file" onChange={handleFileChange} />
                        </div>
                    ) : (
                        <div className="mx_cloudsharemodal__rooms">
                            { rooms.map((room) => (
                                <div
                                    className='mx_cloudsharemodal__room'
                                    onClick={(e) => roomClickHandler(room, e)}
                                    key={room.roomId}
                                >
                                    <RoomTileCustom
                                        room={room}
                                        showMessagePreview={false}
                                        isMinimized={false}
                                        tag=""
                                    />
                                </div>
                            )) }
                        </div>
                    ) }
                </div>
            </div>
        </div>
    );
};

export default CloudShareModal;
