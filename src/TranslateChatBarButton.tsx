import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { ModalCloseButton, ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { IconComponent } from "@utils/types";
import { Button, Forms, React, showToast, Toasts } from "@webpack/common";

import { TARGET_LANGUAGES } from "./languages";
import { LiveTranslateMount } from "./LiveTranslatePanel";
import { settings } from "./settings";

const TranslateChatIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg viewBox="0 96 960 960" width={width} height={height} className={className}>
        <path fill="currentColor" d="m475 976 181-480h82l186 480h-87l-41-126H604l-47 126h-82Zm151-196h142l-70-194h-2l-70 194Zm-466 76-55-55 204-204q-38-44-67.5-88.5T190 416h87q17 33 37.5 62.5T361 539q45-47 75-97.5T487 336H40v-80h280v-80h80v80h280v80H567q-22 69-58.5 135.5T419 598l98 99-30 81-127-122-200 200Z" />
    </svg>
);

function PickerModal({ modalProps }: { modalProps: any; }) {
    const current = settings.use(["defaultTargetLanguage"]).defaultTargetLanguage as string;

    return (
        <ModalRoot {...modalProps} size={ModalSize.SMALL}>
            <ModalHeader>
                <Forms.FormTitle tag="h3" style={{ flex: 1, margin: 0 }}>选择翻译目标语言</Forms.FormTitle>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <ModalContent>
                <Forms.FormText style={{ marginBottom: "12px" }}>
                    选定后，输入框上方的边写边译面板会按此语言翻译。
                </Forms.FormText>
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    paddingBottom: "16px",
                }}>
                    {TARGET_LANGUAGES.map(lang => (
                        <Button
                            key={lang.code}
                            look={current === lang.code ? Button.Looks.FILLED : Button.Looks.OUTLINED}
                            onClick={() => {
                                settings.store.defaultTargetLanguage = lang.code;
                                showToast(`已切换到 ${lang.label}`, Toasts.Type.SUCCESS);
                                modalProps.onClose();
                            }}
                        >
                            {lang.label}
                        </Button>
                    ))}
                </div>
            </ModalContent>
        </ModalRoot>
    );
}

export const TranslateChatBarButton: ChatBarButtonFactory = ({ isMainChat, channel }) => {
    if (!isMainChat) return null;
    return (
        <>
            <ChatBarButton
                tooltip="选择翻译目标语言（边写边译会用这个语言）"
                onClick={() => openModal(props => <PickerModal modalProps={props} />)}
            >
                <TranslateChatIcon />
            </ChatBarButton>
            <LiveTranslateMount channelId={channel.id} />
        </>
    );
};

export { TranslateChatIcon };
