import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ChakraProvider,
  Box,
  Grid,
  GridItem,
  Button,
  Textarea,
  VStack,
  IconButton,
  useToast,
  Text,
  Flex,
  Input,
  Editable,
  EditablePreview,
  EditableInput,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Image,
  Link,
  SimpleGrid,
  Card,
  CardBody,
  CardFooter,
  Heading,
  Stack,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useClipboard,
} from '@chakra-ui/react';
import { FaFileUpload, FaCopy, FaArrowRight, FaSearch, FaYoutube, FaGoogle, FaImage, FaPlus, FaShare, FaLink } from 'react-icons/fa';
import { createWorker } from 'tesseract.js';
import OpenAI from 'openai';
import 'github-markdown-css/github-markdown.css';

// 전역 스타일 추가
const globalStyles = `
  body {
    margin: 0;
    padding: 0;
  }
`;

function App() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSummarized, setIsSummarized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({
    youtube: [],
    google: [],
    images: []
  });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [searchType, setSearchType] = useState('');
  const toast = useToast();
  const [showMediaPrompt, setShowMediaPrompt] = useState(false);
  const [videoSummaries, setVideoSummaries] = useState({});
  const { onCopy } = useClipboard('');
  const [isShared, setIsShared] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [isCrawling, setIsCrawling] = useState(false);

  useEffect(() => {
    // URL hash에서 공유된 데이터 확인
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const sharedData = JSON.parse(decodeURIComponent(hash));
        setOutputText(sharedData);
        setIsSummarized(true);
        setIsShared(true);
      } catch (error) {
        console.error('공유 데이터 파싱 실패:', error);
      }
    }
  }, []);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const worker = await createWorker('kor+eng');
      
      const { data: { text } } = await worker.recognize(file);
      setInputText(text);
      await worker.terminate();
      toast({
        title: '이미지 인식 완료',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: '이미지 인식 실패',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
    setIsLoading(false);
  };

  const handleSummarize = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/getSummary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText })
      });

      if (!response.ok) {
        throw new Error('API 요청 실패');
      }

      const data = await response.json();
      const result = JSON.parse(data.summary);
      setOutputText(result);
      setIsSummarized(true);
      setShowMediaPrompt(true);
      
      setSearchQuery(result.title);
      const searchResponse = await fetch(`http://localhost:5000/api/youtube/search/${encodeURIComponent(result.title)}`);
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        setSearchResults(prev => ({
          ...prev,
          youtube: searchData
        }));
      }
      
      toast({
        title: '요약 완료',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: '요약 실패',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
    setIsLoading(false);
  };

  const handleCopy = () => {
    if (!outputText) return;

    const copyText = `# ${outputText.title}\n\n` +
      `## 핵심 키워드\n${outputText.keywords.map(k => `#${k}`).join(' ')}\n\n` +
      `## 요약\n${outputText.summary.join('\n\n')}\n\n` +
      `## 추가 참고사항\n${outputText.insights}`;

    navigator.clipboard.writeText(copyText);
    toast({
      title: '복사 완료',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleTitleChange = (newTitle) => {
    setOutputText(prev => ({
      ...prev,
      title: newTitle
    }));
  };

  const handleKeywordChange = (index, newKeyword) => {
    const newKeywords = [...outputText.keywords];
    newKeywords[index] = newKeyword;
    setOutputText(prev => ({
      ...prev,
      keywords: newKeywords
    }));
  };

  const handleSummaryChange = (newText) => {
    const summaries = newText.split(/(?=^# )/m).filter(text => text.trim());
    setOutputText(prev => ({
      ...prev,
      summary: summaries
    }));
  };

  const handleInsightsChange = (newInsights) => {
    setOutputText(prev => ({
      ...prev,
      insights: newInsights
    }));
  };

  const handleAddKeyword = () => {
    setOutputText(prev => ({
      ...prev,
      keywords: [...prev.keywords, '']
    }));
  };

  const handleRemoveKeyword = (index) => {
    setOutputText(prev => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index)
    }));
  };

  const handleSearch = async (type) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      let endpoint = '';
      switch (type) {
        case 'youtube':
          endpoint = `/api/youtube/search/${encodeURIComponent(searchQuery)}`;
          break;
        case 'google':
          endpoint = `/api/google/getSearchResult/${encodeURIComponent(searchQuery)}`;
          break;
        case 'images':
          endpoint = `/api/google/getImgSearchResult/${encodeURIComponent(searchQuery)}`;
          break;
      }

      const response = await fetch(`http://localhost:5000${endpoint}`);
      if (!response.ok) {
        throw new Error('검색 실패');
      }

      const data = await response.json();
      setSearchResults(prev => ({
        ...prev,
        [type]: data
      }));

      setSearchType(type);
      onOpen();

      toast({
        title: '검색 완료',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: '검색 실패',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
    setIsLoading(false);
  };

  const openSearchModal = (type) => {
    setSearchType(type);
    if ((type === 'youtube' && searchResults.youtube.length > 0) || 
        (type === 'images' && searchResults.images.length > 0)) {
      onOpen();
    } else {
      setSearchQuery(outputText.title || '');
      handleSearch(type);
    }
  };

  const handleVideoSummary = async (videoId) => {
    if (videoSummaries[videoId]) return;

    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/youtube/getVideoSummary/${videoId}`);
      if (!response.ok) {
        throw new Error('영상 요약 실패');
      }

      const data = await response.json();
      setVideoSummaries(prev => ({
        ...prev,
        [videoId]: data.Result
      }));
      
      toast({
        title: '영상 요약 완료',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: '영상 요약 실패',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
    setIsLoading(false);
  };

  const handleAddMedia = async (type, item) => {
    let mediaContent = '';
    switch (type) {
      case 'youtube':
        // 영상 요약 가져오기
        if (!videoSummaries[item.videoId]) {
          try {
            const response = await fetch(`http://localhost:5000/api/youtube/getVideoSummary/${item.videoId}`);
            if (response.ok) {
              const data = await response.json();
              setVideoSummaries(prev => ({
                ...prev,
                [item.videoId]: data.Result
              }));
            }
          } catch (error) {
            console.error('영상 요약 가져오기 실패:', error);
          }
        }
        mediaContent = `[![${item.title}](https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg)](https://www.youtube.com/watch?v=${item.videoId})\n\n${videoSummaries[item.videoId] ? `> **영상 요약:** ${videoSummaries[item.videoId]}\n\n` : ''}`;
        break;
      case 'image':
        mediaContent = `![${item.title || '이미지'}](${item.link})`;
        break;
    }

    const currentText = outputText.summary.join('\n\n');
    const newText = currentText + '\n' + mediaContent;
    const newSummaries = newText.split(/(?=^# )/m).filter(text => text.trim());
    
    setOutputText(prev => ({
      ...prev,
      summary: newSummaries
    }));

    onClose();
    toast({
      title: '미디어 추가 완료',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  const handleShare = () => {
    if (!outputText) return;

    const shareData = {
      title: outputText.title,
      keywords: outputText.keywords,
      summary: outputText.summary,
      insights: outputText.insights
    };

    const shareUrl = `${window.location.origin}/share#${encodeURIComponent(JSON.stringify(shareData))}`;
    onCopy(shareUrl);

    toast({
      title: '공유 링크가 복사되었습니다',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleCrawl = async () => {
    if (!linkUrl.trim()) return;

    setIsCrawling(true);
    try {
      const response = await fetch('http://localhost:5000/api/crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: linkUrl })
      });

      if (!response.ok) {
        throw new Error('크롤링 실패');
      }

      const data = await response.json();
      setInputText(prev => prev + '\n\n' + data.text);
      setShowLinkInput(false);
      setLinkUrl('');
      
      toast({
        title: '링크 내용 추가 완료',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: '링크 내용 추가 실패',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
    setIsCrawling(false);
  };

  const CustomMarkdown = ({ children }) => {
    return (
      <ReactMarkdown
        components={{
          img: ({ node, ...props }) => {
            // YouTube 썸네일 이미지인 경우
            if (props.src?.includes('youtube.com/vi/')) {
              const videoId = props.src.split('/vi/')[1].split('/')[0];
              return (
                <Box 
                  position="relative" 
                  w="100%" 
                  maxW="400px" 
                  borderRadius="lg" 
                  overflow="hidden"
                  boxShadow="md"
                  mb={4}
                >
                  <Image
                    {...props}
                    w="100%"
                    h="auto"
                    objectFit="cover"
                  />
                  <Box
                    position="absolute"
                    top={2}
                    right={2}
                    bg="red.500"
                    color="white"
                    px={2}
                    py={1}
                    borderRadius="md"
                    fontSize="sm"
                    fontWeight="bold"
                  >
                    유튜브
                  </Box>
                  <Link
                    href={`https://www.youtube.com/watch?v=${videoId}`}
                    isExternal
                    position="absolute"
                    bottom={0}
                    left={0}
                    right={0}
                    bg="rgba(0, 0, 0, 0.7)"
                    color="white"
                    p={2}
                    fontSize="sm"
                    _hover={{ textDecoration: 'none', bg: 'rgba(0, 0, 0, 0.8)' }}
                  >
                    {props.alt || 'YouTube 영상 보기'}
                  </Link>
                </Box>
              );
            }
            // 일반 이미지인 경우
            return (
              <Box 
                position="relative" 
                w="100%" 
                maxW="400px" 
                borderRadius="lg" 
                overflow="hidden"
                boxShadow="md"
                mb={4}
              >
                <Image
                  {...props}
                  w="100%"
                  h="auto"
                  objectFit="cover"
                />
                {props.alt && (
                  <Box
                    position="absolute"
                    bottom={0}
                    left={0}
                    right={0}
                    bg="rgba(0, 0, 0, 0.7)"
                    color="white"
                    p={2}
                    fontSize="sm"
                  >
                    {props.alt}
                  </Box>
                )}
              </Box>
            );
          },
          blockquote: ({ node, ...props }) => {
            return (
              <Box
                as="blockquote"
                p={3}
                bg="gray.50"
                borderRadius="md"
                borderLeft="4px solid"
                borderColor="blue.500"
                fontSize="sm"
                color="gray.700"
                mb={4}
              >
                {props.children}
              </Box>
            );
          }
        }}
      >
        {children}
      </ReactMarkdown>
    );
  };

  return (
    <ChakraProvider>
      <style>{globalStyles}</style>
      <Box p={4} h="100vh">
        {isShared ? (
          // 공유된 요약 보기 모드
          <Box maxW="800px" mx="auto" p={8}>
            <VStack spacing={6} align="stretch">
              <Heading size="xl" textAlign="center" color="blue.700">
                {outputText.title}
              </Heading>
              
              <Box>
                <Heading size="md" color="blue.600" mb={2}>핵심 키워드</Heading>
                <Flex wrap="wrap" gap={2}>
                  {outputText.keywords.map((keyword, index) => (
                    <Text
                      key={index}
                      display="inline-block"
                      background="yellow.100"
                      padding="4px 8px"
                      borderRadius="md"
                      color="blue.800"
                    >
                      #{keyword}
                    </Text>
                  ))}
                </Flex>
              </Box>

              <Box>
                <Heading size="md" color="blue.600" mb={2}>요약</Heading>
                <Box 
                  p={4} 
                  borderWidth={1} 
                  borderRadius="md"
                  className="markdown-body"
                >
                  <CustomMarkdown>{outputText.summary.join('\n\n')}</CustomMarkdown>
                </Box>
              </Box>

              <Box>
                <Heading size="md" color="blue.600" mb={2}>추가 참고사항</Heading>
                <Box 
                  p={4} 
                  borderWidth={1} 
                  borderRadius="md"
                  className="markdown-body"
                >
                  <CustomMarkdown>{outputText.insights}</CustomMarkdown>
                </Box>
              </Box>
            </VStack>
          </Box>
        ) : (
          <Grid 
            templateColumns={isSummarized ? "30% 10% 60%" : "45% 10% 45%"} 
            gap={4} 
            h="100%"
            transition="all 0.3s ease-in-out"
          >
            <GridItem>
              <VStack spacing={4} h="100%">
                <Flex gap={2} w="100%">
                  <Button
                    leftIcon={<FaFileUpload />}
                    colorScheme="blue"
                    flex={1}
                    isLoading={isLoading}
                  >
                    <label style={{ width: '100%', cursor: 'pointer' }}>
                      이미지를 통해 업로드
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </Button>
                  <Button
                    leftIcon={<FaLink />}
                    colorScheme="blue"
                    onClick={() => setShowLinkInput(!showLinkInput)}
                  >
                    링크로 추가
                  </Button>
                </Flex>
                {showLinkInput && (
                  <Box w="100%">
                    <Flex gap={2}>
                      <Input
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="웹 페이지 URL을 입력하세요"
                        size="sm"
                      />
                      <Button
                        colorScheme="blue"
                        onClick={handleCrawl}
                        isLoading={isCrawling}
                        size="sm"
                      >
                        추가
                      </Button>
                    </Flex>
                  </Box>
                )}
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="텍스트를 입력하거나 이미지를 업로드하세요"
                  size="lg"
                  flex={1}
                  resize="none"
                />
              </VStack>
            </GridItem>

            <GridItem display="flex" alignItems="center" justifyContent="center">
              <IconButton
                icon={<FaArrowRight />}
                colorScheme="green"
                onClick={handleSummarize}
                isLoading={isLoading}
                isDisabled={!inputText.trim()}
                size="lg"
              />
            </GridItem>

            <GridItem>
              <VStack spacing={4} h="100%">
                <Flex w="100%" justify="space-between" align="center">
                  <Text fontSize="xl" fontWeight="bold">요약 결과</Text>
                  <Flex gap={2}>
                    <Button
                      size="sm"
                      colorScheme={isEditing ? "red" : "blue"}
                      onClick={() => {
                        setIsEditing(!isEditing);
                        setShowMediaPrompt(false);
                      }}
                    >
                      {isEditing ? "편집 완료" : "편집하기"}
                    </Button>
                    <IconButton
                      icon={<FaShare />}
                      onClick={handleShare}
                      isDisabled={!outputText}
                      colorScheme="blue"
                    />
                    <IconButton
                      icon={<FaCopy />}
                      onClick={handleCopy}
                      isDisabled={!outputText}
                      colorScheme="blue"
                    />
                  </Flex>
                </Flex>
                {showMediaPrompt && !isEditing && (
                  <Box
                    p={4}
                    bg="blue.50"
                    borderRadius="md"
                    w="100%"
                  >
                    <VStack spacing={3} align="stretch">
                      <Text fontWeight="bold">사진 및 유튜브 영상을 추가할까요?</Text>
                      <Text fontSize="sm" color="gray.600">
                        요약 내용과 관련된 이미지나 영상을 추가하면 더 풍부한 내용을 만들 수 있습니다.
                      </Text>
                      <Flex gap={2}>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          leftIcon={<FaYoutube />}
                          onClick={() => {
                            openSearchModal('youtube');
                            setShowMediaPrompt(false);
                          }}
                        >
                          유튜브 영상 추가
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          leftIcon={<FaImage />}
                          onClick={() => {
                            openSearchModal('images');
                            setShowMediaPrompt(false);
                          }}
                        >
                          이미지 추가
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowMediaPrompt(false)}
                        >
                          나중에 하기
                        </Button>
                      </Flex>
                    </VStack>
                  </Box>
                )}
                <Box
                  flex={1}
                  w="100%"
                  p={8}
                  borderWidth={1}
                  borderRadius="lg"
                  overflowY="auto"
                  bg="white"
                  boxShadow="lg"
                >
                  {outputText && (
                    <div>
                      {isEditing ? (
                        <Input
                          value={outputText.title}
                          onChange={(e) => handleTitleChange(e.target.value)}
                          fontSize="2xl"
                          color="blue.700"
                          textAlign="center"
                          mb={4}
                        />
                      ) : (
                        <h1 style={{ fontSize: '2xl', color: 'blue.700', textAlign: 'center' }}>{outputText.title}</h1>
                      )}
                      
                      <h2 style={{ fontSize: 'xl', color: 'blue.600', marginTop: '1rem' }}>핵심 키워드</h2>
                      <Flex wrap="wrap" gap={2} mb={4}>
                        {outputText.keywords.map((keyword, index) => (
                          <Flex key={index} align="center" gap={2}>
                            {isEditing ? (
                              <>
                                <Input
                                  value={keyword}
                                  onChange={(e) => handleKeywordChange(index, e.target.value)}
                                  size="sm"
                                  width="auto"
                                />
                                <IconButton
                                  size="sm"
                                  colorScheme="red"
                                  icon={<span>×</span>}
                                  onClick={() => handleRemoveKeyword(index)}
                                />
                              </>
                            ) : (
                              <Text
                                display="inline-block"
                                background="yellow.100"
                                padding="4px 8px"
                                borderRadius="md"
                                color="blue.800"
                              >
                                #{keyword}
                              </Text>
                            )}
                          </Flex>
                        ))}
                        {isEditing && (
                          <Button size="sm" onClick={handleAddKeyword}>
                            키워드 추가
                          </Button>
                        )}
                      </Flex>

                      <h2 style={{ fontSize: 'xl', color: 'blue.600', marginTop: '1rem' }}>요약</h2>
                      <Flex direction="column" gap={2}>
                        {isEditing ? (
                          <Tabs variant="enclosed">
                            <TabList>
                              <Tab>편집</Tab>
                              <Tab>미리보기</Tab>
                            </TabList>
                            <TabPanels>
                              <TabPanel p={0}>
                                <Textarea
                                  value={outputText.summary.join('\n\n')}
                                  onChange={(e) => handleSummaryChange(e.target.value)}
                                  size="sm"
                                  fontFamily="monospace"
                                  placeholder="마크다운 형식으로 작성해주세요. 각 요약은 # 으로 시작하는 헤더로 구분됩니다."
                                  minH="300px"
                                  style={{ whiteSpace: 'pre' }}
                                  resize="vertical"
                                />
                                <Flex gap={2} mt={4}>
                                  <Button size="sm" onClick={() => openSearchModal('youtube')} leftIcon={<FaYoutube />}>
                                    유튜브 추가
                                  </Button>
                                  <Button size="sm" onClick={() => openSearchModal('images')} leftIcon={<FaImage />}>
                                    이미지 추가
                                  </Button>
                                </Flex>
                              </TabPanel>
                              <TabPanel p={0}>
                                <Box 
                                  p={2} 
                                  borderWidth={1} 
                                  borderRadius="md"
                                  className="markdown-body"
                                >
                                  <CustomMarkdown>{outputText.summary.join('\n\n')}</CustomMarkdown>
                                </Box>
                              </TabPanel>
                            </TabPanels>
                          </Tabs>
                        ) : (
                          <Box 
                            p={2} 
                            borderWidth={1} 
                            borderRadius="md"
                            className="markdown-body"
                          >
                            <CustomMarkdown>{outputText.summary.join('\n\n')}</CustomMarkdown>
                          </Box>
                        )}
                      </Flex>

                      <h2 style={{ fontSize: 'xl', color: 'blue.600', marginTop: '1rem' }}>추가 참고사항</h2>
                      {isEditing ? (
                        <Tabs variant="enclosed">
                          <TabList>
                            <Tab>편집</Tab>
                            <Tab>미리보기</Tab>
                          </TabList>
                          <TabPanels>
                            <TabPanel p={0}>
                              <Textarea
                                value={outputText.insights}
                                onChange={(e) => handleInsightsChange(e.target.value)}
                                size="sm"
                                fontFamily="monospace"
                                placeholder="마크다운 형식으로 작성해주세요"
                              />
                            </TabPanel>
                            <TabPanel p={0}>
                              <Box 
                                p={2} 
                                borderWidth={1} 
                                borderRadius="md"
                                className="markdown-body"
                              >
                                <CustomMarkdown>{outputText.insights}</CustomMarkdown>
                              </Box>
                            </TabPanel>
                          </TabPanels>
                        </Tabs>
                      ) : (
                        <Box 
                          p={2} 
                          borderWidth={1} 
                          borderRadius="md"
                          className="markdown-body"
                        >
                          <CustomMarkdown>{outputText.insights}</CustomMarkdown>
                        </Box>
                      )}
                    </div>
                  )}
                </Box>
              </VStack>
            </GridItem>
          </Grid>
        )}

        <Modal isOpen={isOpen} onClose={onClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>
              {searchType === 'youtube' ? '유튜브 영상 검색' : '이미지 검색'}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <VStack spacing={4} align="stretch">
                <Flex gap={2}>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="검색어를 입력하세요"
                  />
                  <IconButton
                    icon={<FaSearch />}
                    colorScheme="blue"
                    onClick={() => handleSearch(searchType)}
                    isLoading={isLoading}
                  />
                </Flex>
                <Text fontSize="sm" color="gray.500">
                  기본 검색어: {outputText.title}
                </Text>
                {searchType === 'youtube' ? (
                  <VStack spacing={4} align="stretch">
                    {searchResults.youtube.map((video, index) => (
                      <Card key={index}>
                        <CardBody>
                          <Flex gap={4}>
                            <Box position="relative" w="240px" h="135px" flexShrink={0}>
                              <Image
                                src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                                alt={video.title}
                                w="100%"
                                h="100%"
                                objectFit="cover"
                                borderRadius="md"
                              />
                              <Box
                                position="absolute"
                                top={2}
                                right={2}
                                bg="red.500"
                                color="white"
                                px={2}
                                py={1}
                                borderRadius="md"
                                fontSize="sm"
                                fontWeight="bold"
                              >
                                유튜브
                              </Box>
                              <Box
                                position="absolute"
                                bottom={2}
                                right={2}
                                bg="black"
                                color="white"
                                px={2}
                                py={1}
                                borderRadius="md"
                                fontSize="sm"
                              >
                                {video.duration}
                              </Box>
                            </Box>
                            <Box flex={1}>
                              <Heading size="md" mb={2}>
                                <Link href={`https://www.youtube.com/watch?v=${video.videoId}`} isExternal color="blue.500">
                                  {video.title}
                                </Link>
                              </Heading>
                              <Text fontSize="sm" color="gray.600" mb={2}>
                                {video.description}
                              </Text>
                              {videoSummaries[video.videoId] ? (
                                <Box
                                  p={2}
                                  bg="gray.50"
                                  borderRadius="md"
                                  fontSize="sm"
                                  color="gray.700"
                                >
                                  <Text fontWeight="bold" mb={1}>영상 요약:</Text>
                                  <Text>{videoSummaries[video.videoId]}</Text>
                                </Box>
                              ) : (
                                <Button
                                  size="sm"
                                  colorScheme="blue"
                                  variant="outline"
                                  onClick={() => handleVideoSummary(video.videoId)}
                                  isLoading={isLoading}
                                >
                                  요약 보기
                                </Button>
                              )}
                            </Box>
                          </Flex>
                        </CardBody>
                        <Divider />
                        <CardFooter>
                          <Button
                            colorScheme="blue"
                            onClick={() => handleAddMedia('youtube', video)}
                          >
                            추가하기
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </VStack>
                ) : (
                  <SimpleGrid columns={2} spacing={4}>
                    {searchResults.images.map((image, index) => (
                      <Card key={index}>
                        <CardBody p={0}>
                          <Image
                            src={image}
                            alt={`검색된 이미지 ${index + 1}`}
                            objectFit="cover"
                            w="100%"
                            h="200px"
                          />
                        </CardBody>
                        <CardFooter>
                          <Button
                            colorScheme="blue"
                            onClick={() => handleAddMedia('image', {
                              link: image,
                              title: `검색된 이미지 ${index + 1}`
                            })}
                          >
                            추가하기
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </SimpleGrid>
                )}
              </VStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    </ChakraProvider>
  );
}

export default App;
