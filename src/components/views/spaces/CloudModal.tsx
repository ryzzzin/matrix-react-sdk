/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable matrix-org/require-copyright-header */
import firebase from "firebase";
import React, { useContext, useEffect, useState } from 'react';

import MatrixClientContext from '../../../contexts/MatrixClientContext';
import ImageModal from "./ImageModal";

interface Props {
    onClose: () => void;
    reviewMode?: boolean;
}

interface CloudStorageFile {
    name: string;
    fullPath: string;
    downloadUrl: string;
}

interface CloudStorageFileHistory {
    documentID: string;
    senderName: string;
    createdAt: string;
    filePath: string;
}

interface FileProps {
    file: CloudStorageFile;
}

interface HistoryItemProps {
    history: CloudStorageFileHistory;
}

const CloudModal: React.FC<Props> = ({ onClose, reviewMode }) => {
    const [isFilesLoading, setIsFilesLoading] = useState(true);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [isShowingHistory, setIsShowingHistory] = useState<boolean>(reviewMode);
    const [files, setFiles] = useState<CloudStorageFile[]>([]);
    const [fileHistory, setFileHistory] = useState<CloudStorageFileHistory[]>([]);
    const [previewFileSrc, setPreviewFileSrc] = useState<string>(null);
    const matrixClient = useContext(MatrixClientContext);
    const userId = matrixClient.credentials.userId;
    console.log(userId);

    const toggleIsShowingHistory = () => {
        setIsShowingHistory(!isShowingHistory);
    };

    const removeHistory = (documentIDToDelete: string) => {
        const updatedFileHistory = fileHistory.filter(
            (item) => item.documentID !== documentIDToDelete,
        );

        setFileHistory(updatedFileHistory);
    };

    const updateFiles = async (fileRefs: firebase.storage.Reference[]) => {
        const fileItems = await Promise.all(fileRefs.map(async (fileRef) => {
            const downloadUrl = await fileRef.getDownloadURL();
            const file: CloudStorageFile = {
                name: fileRef.name,
                fullPath: fileRef.fullPath,
                downloadUrl,
            };
            console.log("FILE", file);
            return file;
        }));

        console.log('FILEITEMS', fileItems);

        setFiles(fileItems);
    };

    const getFileByRef = async (fileRef: firebase.storage.Reference) => {
        const downloadUrl = await fileRef.getDownloadURL();
        const file: CloudStorageFile = {
            name: fileRef.name,
            fullPath: fileRef.fullPath,
            downloadUrl,
        };
        return file;
    };

    const getFileByPath = async (filePath: string) => {
        const fileRef = firebase.storage().ref().child(filePath);
        const file = await getFileByRef(fileRef);
        return file;
    };

    const fetchFiles = () => {
        const storage = firebase.storage();

        // Create a reference under which you want to list
        const listRef = storage.ref(`files/${userId}/saved`);

        // Find all the prefixes and items.
        listRef.listAll()
            .then(async (res) => {
                console.log(res.prefixes);
                console.log(res.items);

                updateFiles(res.items);
            }).catch((error) => {
                console.error("ERROR FETCHING FILES");
            // Uh-oh, an error occurred!
            }).finally(() => {
                setIsFilesLoading(false);
            });
    };

    useEffect(() => {
        if (!reviewMode) {
            fetchFiles();
        }
    }, []);

    useEffect(() => {
        const db = firebase.firestore();
        const status = reviewMode ? 'Pending' : 'Accepted';

        const unsubscribe = db
            .collection('cloud')
            .where('recipientID', '==', userId)
            .where('status', '==', status)
            .onSnapshot((querySnapshot) => {
                const updatedFileHistory: CloudStorageFileHistory[] = [];

                querySnapshot.forEach((document) => {
                    const documentID = document.id;
                    const { senderName, filePath, createdAt } = document.data();
                    const formattedDate = new Intl.DateTimeFormat('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    }).format(createdAt.toDate());

                    updatedFileHistory.push({ documentID, senderName, createdAt: formattedDate, filePath });
                });

                setFileHistory(updatedFileHistory);
                setIsHistoryLoading(false);
            });

        return () => unsubscribe();
    }, [userId, reviewMode]);

    function getTruncatedString(str, startLength = 5, endLength = 7) {
        if (str.length <= startLength + endLength) {
            return str;
        }

        const start = str.slice(0, startLength);
        const end = str.slice(-endLength);

        return `${start}...${end}`;
    }

    const deleteButtonHandler = (path: string, event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.stopPropagation();

        const storage = firebase.storage();
        const fileRef = storage.ref(path);

        fileRef
            .delete()
            .then(() => {
            // Remove the object from the files state
                setFiles((prevFiles) => prevFiles.filter((file) => file.fullPath !== path));
            })
            .catch((error) => {
                console.error('Error deleting file:', error);
            });
    };

    const downloadButtonHandler = (file: CloudStorageFile, event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.stopPropagation();

        const link = document.createElement('a');
        link.href = file.downloadUrl;
        link.download = file.name;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.click();
    };

    const openFileInNewTab = async (file: CloudStorageFile) => {
        if (isImageFile(file.name)) {
            setPreviewFileSrc(file.downloadUrl);
        } else {
            try {
                openFileURLInNewTab(file.downloadUrl);
            } catch (error) {
                console.error('Error opening file:', error);
            }
        }
    };

    const isImageFile = (fileName: string) => {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif'];
        const fileExtension = getFileExtension(fileName);
        return imageExtensions.includes(fileExtension);
    };

    const getFileExtension = (fileName: string) => {
        const dotIndex = fileName.lastIndexOf('.');
        if (dotIndex === -1) {
            return '';
        }
        return fileName.slice(dotIndex + 1).toLowerCase();
    };

    const openFileURLInNewTab = (fileURL: string) => {
        window.open(fileURL, '_blank').focus();
    };

    const rejectPendingFile = async (history: CloudStorageFileHistory) => {
        const { filePath, documentID } = history;
        const storageRef = firebase.storage().ref();

        const pendingRef = storageRef.child(filePath);

        pendingRef
            .delete()
            .then(() => {
                console.log('File deleted successfully');

                firebase.firestore()
                    .collection('cloud')
                    .doc(documentID)
                    .set({ status: 'Rejected' }, { merge: true })
                    .then(() => {
                        console.log('Document status successfully updated!');
                        removeHistory(documentID);
                    })
                    .catch((error) => {
                        console.error('Error updating document status:', error);
                    });
            })
            .catch((error) => {
                console.error('Error deleting file:', error);
            });
    };

    const acceptPendingFile = async (history: CloudStorageFileHistory) => {
        const { filePath, documentID } = history;

        const storageRef = firebase.storage().ref();
        const pendingRef = storageRef.child(filePath);
        const savedPath = filePath.replace('/pending/', '/saved/');
        const savedRef = storageRef.child(savedPath);
        const downloadURL = await pendingRef.getDownloadURL();
        const response = await fetch(downloadURL);

        if (!response.ok) {
            console.error('Failed to download file');
        }

        const data = await response.blob();

        savedRef.put(data).then(() => {
            pendingRef
                .delete()
                .then(() => {
                    console.log('File deleted successfully');

                    firebase.firestore()
                        .collection('cloud')
                        .doc(documentID)
                        .set({ status: 'Accepted', filePath: savedPath }, { merge: true })
                        .then(() => {
                            console.log('Document status successfully updated!');
                            removeHistory(documentID);
                        })
                        .catch((error) => {
                            console.error('Error updating document status:', error);
                        });
                })
                .catch((error) => {
                    console.error('Error deleting file:', error);
                });
        }).catch((error) => {
            console.error('Error uploading file:', error);
        });
    };

    const File = ({ file }: FileProps) => {
        return (
            <div className="mx_cloudmodal__file mx_cloudfile" onClick={() => openFileInNewTab(file)}>
                <div className="mx_cloudfile__preview">
                    { isImageFile(file.name) ? (
                        <img className="mx_cloudfile__previewImage" src={file.downloadUrl} alt="" />
                    ) : (
                        <img
                            className="mx_cloudfile__previewImage mx_cloudfile__previewPlaceholder"
                            src={require("../../../../res/img/feather-customised/files.svg").default}
                            alt=""
                        />
                    ) }
                    <div className="mx_cloudfile__actions">
                        <button className="mx_cloudfile__action" onClick={(e) => downloadButtonHandler(file, e)}>
                            <img src={require("../../../../res/img/image-view/download-light.svg").default} alt="" />
                        </button>
                        <button className="mx_cloudfile__action" onClick={(e) => deleteButtonHandler(file.fullPath, e)}>
                            <img src={require("../../../../res/img/feather-customised/trash.custom.svg").default} alt="" />
                        </button>
                    </div>
                </div>
                <p className="mx_cloudfile__name" title={file.name}>
                    { getTruncatedString(file.name) }
                </p>
            </div>
        );
    };

    const HistoryItem = ({ history }: HistoryItemProps) => {
        const [file, setFile] = useState<CloudStorageFile>(null);

        useEffect(() => {
            getFileByPath(history.filePath).then((file) => {
                console.log('🚀 - getFileByPath - file:', file);
                setFile(file);
            });
        }, []);

        return (
            <div className="mx_cloudmodal__historyItem mx_cloudhistory">
                <div className="mx_cloudhistory__main">
                    <div className="mx_cloudhistory__preview" onClick={() => openFileInNewTab(file)}>
                        { file && isImageFile(file.name) ? (
                            <img className="mx_cloudhistory__previewImage" src={file.downloadUrl} alt="" />
                        ) : (
                            <img
                                className="mx_cloudhistory__previewImage mx_cloudhistory__previewPlaceholder"
                                src={require("../../../../res/img/feather-customised/files.svg").default}
                                alt=""
                            />
                        ) }
                    </div>
                    <div className="mx_cloudhistory__info">
                        <p className="mx_cloudhistory__name" title={history.senderName}>
                            { history.senderName }
                        </p>
                        <p className="mx_cloudhistory__date">
                            { history.createdAt }
                        </p>
                    </div>
                </div>
                <div className="mx_cloudhistory__actions">
                    <button
                        className="mx_cloudhistory__action mx_cloudhistory__action--reject"
                        onClick={() => rejectPendingFile(history)}
                    >
                        Отклонить
                    </button>
                    <button
                        className="mx_cloudhistory__action mx_cloudhistory__action--accept"
                        onClick={() => acceptPendingFile(history)}
                    >
                        Принять
                    </button>
                </div>
            </div>
        );
    };

    const FilesList = () => {
        return (
            <div className="mx_cloudmodal__files">
                { files.map(file => (
                    <File file={file} key={file.name} />
                )) }
            </div>
        );
    };

    const HistoryList = () => {
        return (
            <div className="mx_cloudmodal__history">
                { fileHistory.map(history => (
                    <HistoryItem history={history} key={history.createdAt} />
                )) }
            </div>
        );
    };

    return (
        <div className='mx_cloudmodal' onClick={onClose}>
            <div className='mx_cloudmodal__content' onClick={(e) => e.stopPropagation()}>
                <div className="mx_cloudmodal__header">
                    <h1 className="mx_cloudmodal__heading">Облачное хранилище</h1>
                    {
                        !reviewMode &&
                        <button className="mx_cloudmodal__action" onClick={toggleIsShowingHistory}>
                            История
                        </button>
                    }
                </div>
                <div className="mx_cloudmodal__main">
                    {
                        isShowingHistory
                            ? isHistoryLoading
                                ? <p>Идет загрузка...</p>
                                : <HistoryList />
                            : isFilesLoading
                                ? <p>Идет загрузка...</p>
                                : <FilesList />
                    }
                </div>
                { previewFileSrc &&
                    <ImageModal imageSrc={previewFileSrc} onClose={() => setPreviewFileSrc('')} />
                }
            </div>
        </div>
    );
};

export default CloudModal;
