import React, { useState, useEffect, useMemo } from 'react';
import { Tree, Input, Space, Tooltip } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import posthog from 'posthog-js'
import { NONAME } from 'dns';

const { DirectoryTree } = Tree;
const { Search } = Input;

interface SidebarProps {
    componentService: {
        getComponents: () => any[];
    };
}

const Sidebar: React.FC<SidebarProps> = ({ componentService }) => {
    const [searchValue, setSearchValue] = useState('');
    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
    const [autoExpandParent, setAutoExpandParent] = useState(true);
    const [components, setComponents] = useState<any[]>([]);


    useEffect(() => {
        const fetchedComponents = componentService.getComponents();
        setComponents(fetchedComponents);
    }, [componentService]);

    const onDragStart = (event: React.DragEvent, nodeType: string, config: any) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.setData('additionalData', config);
        event.dataTransfer.effectAllowed = 'move';
    };

    const categorizedComponents = useMemo(() => {
        const result: Record<string, Record<string, any[]>> = {};
        components.forEach(component => {
            let [category, subcategory] = component._category.split('.');
            if (!result[category]) {
                result[category] = {};
            }
            if (subcategory) {
                if (!result[category][subcategory]) {
                    result[category][subcategory] = [];
                }
                result[category][subcategory].push(component);
            } else {
                if (!result[category]['_']) {
                    result[category]['_'] = [];
                }
                result[category]['_'].push(component);
            }
        });
        return result;
    }, [components]);


    const getCategoryBackgroundColor = (category: string) => {
        switch (category.toLowerCase()) {
            case 'inputs':
                return 'rgba(68, 121, 111, 0.5)'; // 50% opacity background
            case 'transforms':
                return 'rgba(22, 96, 130, 0.5)'; // 50% opacity background
            case 'outputs':
                return 'rgba(122, 195, 198, 0.3)'; // 50% opacity background
            case 'data exploration':
                return 'rgba(245, 240, 187, 0.5)'; // 50% opacity background
            case 'configuration':
                return 'rgba(219, 223, 234, 0.5)'; // 50% opacity background
            case 'documentation':
                return 'rgba(205, 193, 255, 0.5)'; // 50% opacity background
            default:
                return 'rgba(255, 255, 255, 0.5)'; // Default 50% opacity
        }
    };


    const getTreeData = () => {
        return Object.keys(categorizedComponents).map((category, index) => {
            const subCategories = Object.keys(categorizedComponents[category]);
            let children = [];

            subCategories.forEach((subCat, subIndex) => {
                if (subCat === '_') {
                    children.push(...categorizedComponents[category][subCat].map((component, childIndex) => ({
                        title: (
                            <Tooltip
                                placement="left"
                                title={component._description ? component._description : ''}
                                arrow={true}
                                mouseEnterDelay={1}
                                mouseLeaveDelay={0}
                                align={{ offset: [-30, 0] }}
                                overlayInnerStyle={{ fontSize: '12px' }}
                            >
                                <span
                                    draggable
                                    className="palette-component"
                                    onDragStart={(event) => onDragStart(event, component._id, component._default ? JSON.stringify(component._default) : '{}')}
                                    key={`category-${index}-item-${childIndex}`}
                                >
                                    {component._name}
                                </span>
                            </Tooltip>
                        ),
                        key: `category-${index}-item-${childIndex}`,
                        isLeaf: true,
                        icon: <span className="anticon"><component._icon.react height="14px" width="14px;" /></span>
                    })));
                } else {
                    children.push({
                        title: <span className="palette-component-category">{subCat.charAt(0).toUpperCase() + subCat.slice(1)}</span>,
                        key: `category-${index}-sub-${subIndex}`,
                        children: categorizedComponents[category][subCat].map((component, childIndex) => ({
                            title: (
                                <Tooltip
                                    placement="left"
                                    title={component._description ? component._description : ''}
                                    arrow={true}
                                    mouseEnterDelay={1}
                                    mouseLeaveDelay={0}
                                    align={{ offset: [-30, 0] }}
                                    overlayInnerStyle={{ fontSize: '12px' }}
                                >
                                    <span
                                        draggable
                                        className="palette-component"
                                        onDragStart={(event) => onDragStart(event, component._id, component._default ? JSON.stringify(component._default) : '{}')}
                                        key={`category-${index}-sub-${subIndex}-item-${childIndex}`}
                                    >
                                        {component._name}
                                    </span>
                                </Tooltip>
                            ),
                            key: `category-${index}-sub-${subIndex}-item-${childIndex}`,
                            isLeaf: true,
                            icon: <span className="anticon"><component._icon.react height="14px" width="14px;" /></span>
                        }))
                    });
                }
            });

            return {
                title: <span className="palette-component-category" >{category.charAt(0).toUpperCase() + category.slice(1)}</span>,
                key: `category-${index}`,
                children: children,
                style: {
                    backgroundColor: '#fafafa',
                    padding: '0px 0px 0px 0px',
                    marginBottom: 'Opx'
                },
            };
        });
    };

    const filterTree = (data: any[], searchValue: string) => {
        const filteredData = data
            .map((item) => {
                const newItem = { ...item };

                // Check if newItem.title.props.children is an object or a string
                const childrenText = typeof newItem.title.props.children === 'object'
                    ? newItem.title.props.children.props.children
                    : newItem.title.props.children;

                if (newItem.children) {
                    newItem.children = filterTree(newItem.children, searchValue);
                }

                if (
                    childrenText.toLowerCase().includes(searchValue.toLowerCase()) ||
                    (newItem.children && newItem.children.length > 0)
                ) {
                    return newItem;
                }
                return null;
            })
            .filter(item => item !== null);
        return filteredData;
    };


    const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setSearchValue(value);
        setAutoExpandParent(true);
    };

    const treeData = useMemo(getTreeData, [categorizedComponents]);

    const filteredTreeData = useMemo(() => {
        if (searchValue && searchValue.trim()) {
            return filterTree(treeData, searchValue);
        } else {
            return treeData;
        }
    }, [searchValue, treeData]);

    useEffect(() => {
        const collectKeys = (data: any[]): React.Key[] => {
            return data.reduce((acc: React.Key[], item: any) => {
                // Add the current item's key to the accumulator array
                acc.push(item.key);

                // If the current item has children, recursively collect their keys
                if (item.children) {
                    acc.push(...collectKeys(item.children));
                }

                return acc; // Return the accumulated keys
            }, []);
        };

        // Collect keys based on the presence of a search value
        const keys = searchValue ? collectKeys(filteredTreeData) : Object.keys(categorizedComponents).map((category, index) => `category-${index}`);
        setExpandedKeys(keys); // Update the expanded keys state
    }, [searchValue, filteredTreeData, categorizedComponents]);

    const onExpand = (keys: React.Key[]) => {
        setExpandedKeys(keys);
        setAutoExpandParent(false);
    };

    return (
        <aside className="sidebar" title={'Components'} >
            <div
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 999,
                    backgroundColor: 'white',
                    // padding: '10px'
                }}
            >
                <Space direction="vertical" style={{ marginTop: '10px', marginLeft: '10px', width: '90%', textAlign: 'center' }}>
                    <Input
                        placeholder="Search components"
                        onChange={onSearch}
                        style={{ marginBottom: 8 }}
                        suffix={<SearchOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                    />
                </Space>
            </div>
            <DirectoryTree
                selectable={false}
                multiple
                blockNode
                autoExpandParent={autoExpandParent}
                expandedKeys={expandedKeys}
                onExpand={onExpand}
                treeData={filteredTreeData}
            />
        </aside>
    );
};

export default Sidebar;
