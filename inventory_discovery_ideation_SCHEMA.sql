-- MySQL dump 10.13  Distrib 9.5.0, for macos15.7 (arm64)
--
-- Host: localhost    Database: inventory_discovery_ideation
-- ------------------------------------------------------
-- Server version	9.5.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ 'ec93c0d2-e294-11f0-a704-97cf49fc167a:1-1353153';

--
-- Table structure for table `ANTENNA`
--

DROP TABLE IF EXISTS `ANTENNA`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ANTENNA` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID: this row''s supertype row (identity for relationships, external refs, attributes, reconciliation)',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'ANTENNA' COMMENT 'Constant ANTENNA: FK-bound to RESOURCE so the supertype row is of this type',
  `SITE_ID_FK` int unsigned NOT NULL COMMENT 'FK SITE.ID: where the antenna is installed',
  `RADIO_SECTOR_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK RADIO_SECTOR.ID at the same site (FK-enforced)',
  `MOUNT_EXTERNAL_RESOURCE_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK EXTERNAL_RESOURCE.ID: proxy of the tower / mast / pole it is mounted on; the asset itself is owned by Passive Inventory',
  `CODE` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Antenna id at the site (ANT-1A)',
  `ANTENNA_TYPE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'PANEL' COMMENT 'Kind of antenna. Values: PANEL, OMNI, AAS_INTEGRATED, SMALL_CELL, DAS_NODE, GNSS',
  `VENDOR_ID_FK` smallint unsigned DEFAULT NULL COMMENT 'FK VENDOR.ID',
  `PRODUCT_MODEL_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK PRODUCT_MODEL.ID (category ANTENNA); FK-bound to VENDOR_ID_FK',
  `SERIAL_NUMBER` varchar(64) DEFAULT NULL COMMENT 'Serial number',
  `HEIGHT_M` decimal(6,2) DEFAULT NULL COMMENT 'Height above ground, metres',
  `AZIMUTH_DEG` smallint unsigned DEFAULT NULL COMMENT 'Azimuth, degrees from true north (0-359)',
  `MECHANICAL_TILT_DEG` decimal(4,1) DEFAULT NULL COMMENT 'Mechanical tilt, degrees',
  `ELECTRICAL_TILT_DEG` decimal(4,1) DEFAULT NULL COMMENT 'Current electrical tilt, degrees',
  `MIN_ELECTRICAL_TILT_DEG` decimal(4,1) DEFAULT NULL COMMENT 'Lowest electrical tilt supported, degrees',
  `MAX_ELECTRICAL_TILT_DEG` decimal(4,1) DEFAULT NULL COMMENT 'Highest electrical tilt supported, degrees',
  `REMOTE_ELECTRICAL_TILT_CAPABLE` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 when the antenna has remote electrical tilt',
  `GAIN_DBI` decimal(5,2) DEFAULT NULL COMMENT 'Gain, dBi',
  `HORIZONTAL_BEAM_WIDTH_DEG` decimal(5,2) DEFAULT NULL COMMENT 'Horizontal beam width, degrees',
  `VERTICAL_BEAM_WIDTH_DEG` decimal(5,2) DEFAULT NULL COMMENT 'Vertical beam width, degrees',
  `PORT_COUNT` smallint unsigned DEFAULT NULL COMMENT 'Number of RF ports',
  `STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'IN_SERVICE' COMMENT 'Status. Values: PLANNED, IN_SERVICE, FAULTY, RETIRED',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  `IS_DELETED` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Soft-delete flag (0 = active, 1 = deleted)',
  `LIVE_FLAG` tinyint(1) GENERATED ALWAYS AS (if((`IS_DELETED` = 0),1,NULL)) STORED COMMENT '1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_ANTENNA__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_ANTENNA__RESOURCE_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`RESOURCE_TYPE`),
  UNIQUE KEY `UK_ANTENNA__SITE_ID_CODE` (`CUSTOMER_ID`,`CODE`,`SITE_ID_FK`,`LIVE_FLAG`),
  KEY `IDX_ANTENNA__SITE_ID_FK` (`CUSTOMER_ID`,`SITE_ID_FK`),
  KEY `IDX_ANTENNA__SITE_ID_RADIO_SECTOR_ID` (`CUSTOMER_ID`,`SITE_ID_FK`,`RADIO_SECTOR_ID_FK`),
  KEY `IDX_ANTENNA__MOUNT_EXTERNAL_RESOURCE_ID` (`CUSTOMER_ID`,`MOUNT_EXTERNAL_RESOURCE_ID_FK`),
  KEY `IDX_ANTENNA__VENDOR_ID_FK` (`VENDOR_ID_FK`),
  KEY `IDX_ANTENNA__VENDOR_ID_PRODUCT_MODEL_ID` (`VENDOR_ID_FK`,`PRODUCT_MODEL_ID_FK`),
  CONSTRAINT `FK_ANTENNA__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_ANTENNA__MOUNT_EXTERNAL_RESOURCE` FOREIGN KEY (`CUSTOMER_ID`, `MOUNT_EXTERNAL_RESOURCE_ID_FK`) REFERENCES `EXTERNAL_RESOURCE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_ANTENNA__PRODUCT_MODEL_ID` FOREIGN KEY (`VENDOR_ID_FK`, `PRODUCT_MODEL_ID_FK`) REFERENCES `PRODUCT_MODEL` (`VENDOR_ID_FK`, `ID`),
  CONSTRAINT `FK_ANTENNA__RADIO_SECTOR` FOREIGN KEY (`CUSTOMER_ID`, `SITE_ID_FK`, `RADIO_SECTOR_ID_FK`) REFERENCES `RADIO_SECTOR` (`CUSTOMER_ID`, `SITE_ID_FK`, `ID`),
  CONSTRAINT `FK_ANTENNA__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `FK_ANTENNA__SITE_ID` FOREIGN KEY (`CUSTOMER_ID`, `SITE_ID_FK`) REFERENCES `SITE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_ANTENNA__VENDOR_ID` FOREIGN KEY (`VENDOR_ID_FK`) REFERENCES `VENDOR` (`ID`),
  CONSTRAINT `CK_ANTENNA__ANTENNA_TYPE_VALUES` CHECK ((`ANTENNA_TYPE` in (_utf8mb4'PANEL',_utf8mb4'OMNI',_utf8mb4'AAS_INTEGRATED',_utf8mb4'SMALL_CELL',_utf8mb4'DAS_NODE',_utf8mb4'GNSS'))),
  CONSTRAINT `CK_ANTENNA__AZIMUTH` CHECK (((`AZIMUTH_DEG` is null) or (`AZIMUTH_DEG` <= 359))),
  CONSTRAINT `CK_ANTENNA__MEASURES` CHECK ((((`HEIGHT_M` is null) or (`HEIGHT_M` between 0 and 500)) and ((`HORIZONTAL_BEAM_WIDTH_DEG` is null) or (`HORIZONTAL_BEAM_WIDTH_DEG` between 0 and 360)) and ((`VERTICAL_BEAM_WIDTH_DEG` is null) or (`VERTICAL_BEAM_WIDTH_DEG` between 0 and 180)))),
  CONSTRAINT `CK_ANTENNA__MODEL_NEEDS_VENDOR` CHECK (((`PRODUCT_MODEL_ID_FK` is null) or (`VENDOR_ID_FK` is not null))),
  CONSTRAINT `CK_ANTENNA__RESOURCE_TYPE` CHECK ((`RESOURCE_TYPE` = _utf8mb4'ANTENNA')),
  CONSTRAINT `CK_ANTENNA__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'PLANNED',_utf8mb4'IN_SERVICE',_utf8mb4'FAULTY',_utf8mb4'RETIRED'))),
  CONSTRAINT `CK_ANTENNA__TILT` CHECK ((((`ELECTRICAL_TILT_DEG` is null) or (`ELECTRICAL_TILT_DEG` between -(20) and 20)) and ((`MECHANICAL_TILT_DEG` is null) or (`MECHANICAL_TILT_DEG` between -(20) and 20)))),
  CONSTRAINT `CK_ANTENNA__TILT_RANGE` CHECK (((`MIN_ELECTRICAL_TILT_DEG` is null) or (`MAX_ELECTRICAL_TILT_DEG` is null) or ((`MIN_ELECTRICAL_TILT_DEG` <= `MAX_ELECTRICAL_TILT_DEG`) and ((`ELECTRICAL_TILT_DEG` is null) or (`ELECTRICAL_TILT_DEG` between `MIN_ELECTRICAL_TILT_DEG` and `MAX_ELECTRICAL_TILT_DEG`)))))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Installed RF antenna with sector, mounting, azimuth and tilts. Kept in Inventory pending validation (RF parameters used by cells); mount asset proxied from Passive Inventory. [v6, 2026-09-28]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ANTENNA`
--

LOCK TABLES `ANTENNA` WRITE;
/*!40000 ALTER TABLE `ANTENNA` DISABLE KEYS */;
INSERT INTO `ANTENNA` (`ID`, `CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`, `SITE_ID_FK`, `RADIO_SECTOR_ID_FK`, `MOUNT_EXTERNAL_RESOURCE_ID_FK`, `CODE`, `ANTENNA_TYPE`, `VENDOR_ID_FK`, `PRODUCT_MODEL_ID_FK`, `SERIAL_NUMBER`, `HEIGHT_M`, `AZIMUTH_DEG`, `MECHANICAL_TILT_DEG`, `ELECTRICAL_TILT_DEG`, `MIN_ELECTRICAL_TILT_DEG`, `MAX_ELECTRICAL_TILT_DEG`, `REMOTE_ELECTRICAL_TILT_CAPABLE`, `GAIN_DBI`, `HORIZONTAL_BEAM_WIDTH_DEG`, `VERTICAL_BEAM_WIDTH_DEG`, `PORT_COUNT`, `STATUS`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`, `IS_DELETED`) VALUES (1,1,21,'ANTENNA',1,1,1,'ANT-1A','PANEL',6,9,'KAT2024A001',32.00,30,2.0,4.0,0.0,10.0,1,17.50,65.00,7.50,4,'IN_SERVICE','2026-09-28 08:15:11.563',1,'2026-09-28 08:15:11.563',1,0,0),(2,1,22,'ANTENNA',1,2,1,'ANT-2A','PANEL',6,9,'KAT2024A002',32.00,150,2.0,3.0,0.0,10.0,1,17.50,65.00,7.50,4,'IN_SERVICE','2026-09-28 08:15:11.563',1,'2026-09-28 08:15:11.563',1,0,0);
/*!40000 ALTER TABLE `ANTENNA` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ATTRIBUTE_DEFINITION`
--

DROP TABLE IF EXISTS `ATTRIBUTE_DEFINITION`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ATTRIBUTE_DEFINITION` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'FK RESOURCE_TYPE.CODE the attribute applies to',
  `CODE` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Attribute code (prachConfigurationIndex, ssbPeriodicity, powerSource)',
  `LABEL` varchar(100) NOT NULL COMMENT 'Display label',
  `DATA_TYPE` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Value type; decides which RESOURCE_ATTRIBUTE value column is used. Values: STRING, NUMBER, BOOLEAN, DATE',
  `UNIT` varchar(16) DEFAULT NULL COMMENT 'Unit of a NUMBER value (dBm, ms, MHz)',
  `VENDOR_ID_FK` smallint unsigned DEFAULT NULL COMMENT 'FK VENDOR.ID when vendor-specific; NULL = vendor-neutral',
  `TECHNOLOGY_ID_FK` smallint unsigned DEFAULT NULL COMMENT 'FK TECHNOLOGY.ID when technology-specific; NULL = any',
  `IS_ACTIVE` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1 when new values may be recorded',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_ATTRIBUTE_DEFINITION__RESOURCE_TYPE_CODE` (`CUSTOMER_ID`,`RESOURCE_TYPE`,`CODE`),
  UNIQUE KEY `UK_ATTRIBUTE_DEFINITION__ID_RESOURCE_TYPE_DATA_TYPE` (`CUSTOMER_ID`,`ID`,`RESOURCE_TYPE`,`DATA_TYPE`),
  KEY `IDX_ATTRIBUTE_DEFINITION__RESOURCE_TYPE` (`RESOURCE_TYPE`),
  KEY `IDX_ATTRIBUTE_DEFINITION__VENDOR_ID` (`VENDOR_ID_FK`),
  KEY `IDX_ATTRIBUTE_DEFINITION__TECHNOLOGY_ID` (`TECHNOLOGY_ID_FK`),
  CONSTRAINT `FK_ATTRIBUTE_DEFINITION__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_ATTRIBUTE_DEFINITION__RESOURCE_TYPE` FOREIGN KEY (`RESOURCE_TYPE`) REFERENCES `RESOURCE_TYPE` (`CODE`),
  CONSTRAINT `FK_ATTRIBUTE_DEFINITION__TECHNOLOGY_ID` FOREIGN KEY (`TECHNOLOGY_ID_FK`) REFERENCES `TECHNOLOGY` (`ID`),
  CONSTRAINT `FK_ATTRIBUTE_DEFINITION__VENDOR_ID` FOREIGN KEY (`VENDOR_ID_FK`) REFERENCES `VENDOR` (`ID`),
  CONSTRAINT `CK_ATTRIBUTE_DEFINITION__DATA_TYPE_VALUES` CHECK ((`DATA_TYPE` in (_utf8mb4'STRING',_utf8mb4'NUMBER',_utf8mb4'BOOLEAN',_utf8mb4'DATE'))),
  CONSTRAINT `CK_ATTRIBUTE_DEFINITION__UNIT` CHECK (((`UNIT` is null) or (`DATA_TYPE` = _utf8mb4'NUMBER')))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Typed definition of an extensible attribute for one resource type. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ATTRIBUTE_DEFINITION`
--

LOCK TABLES `ATTRIBUTE_DEFINITION` WRITE;
/*!40000 ALTER TABLE `ATTRIBUTE_DEFINITION` DISABLE KEYS */;
INSERT INTO `ATTRIBUTE_DEFINITION` VALUES (1,1,'PHYSICAL_NE','CIRCLE_TAG','Circle tag','STRING',NULL,NULL,NULL,1,'2026-09-28 08:15:11.574',1,'2026-09-28 08:15:11.574',1,0),(2,1,'SITE','SHELTER_AREA_SQM','Shelter area','NUMBER',NULL,NULL,NULL,1,'2026-09-28 08:15:11.574',1,'2026-09-28 08:15:11.574',1,0);
/*!40000 ALTER TABLE `ATTRIBUTE_DEFINITION` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `CELL_ANTENNA`
--

DROP TABLE IF EXISTS `CELL_ANTENNA`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CELL_ANTENNA` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RADIO_CELL_ID_FK` int unsigned NOT NULL COMMENT 'FK RADIO_CELL.ID',
  `ANTENNA_ID_FK` int unsigned NOT NULL COMMENT 'FK ANTENNA.ID',
  `ANTENNA_PORTS` varchar(32) DEFAULT NULL COMMENT 'RF ports of the antenna used by the cell (R1-R4)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_CELL_ANTENNA__RADIO_CELL_ID_ANTENNA_ID` (`CUSTOMER_ID`,`RADIO_CELL_ID_FK`,`ANTENNA_ID_FK`),
  KEY `IDX_CELL_ANTENNA__ANTENNA_ID` (`CUSTOMER_ID`,`ANTENNA_ID_FK`),
  CONSTRAINT `FK_CELL_ANTENNA__ANTENNA_ID` FOREIGN KEY (`CUSTOMER_ID`, `ANTENNA_ID_FK`) REFERENCES `ANTENNA` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_CELL_ANTENNA__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_CELL_ANTENNA__RADIO_CELL_ID` FOREIGN KEY (`CUSTOMER_ID`, `RADIO_CELL_ID_FK`) REFERENCES `RADIO_CELL` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Antenna(s) a cell radiates through (many-to-many: multi-band antennas serve several cells). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `CELL_ANTENNA`
--

LOCK TABLES `CELL_ANTENNA` WRITE;
/*!40000 ALTER TABLE `CELL_ANTENNA` DISABLE KEYS */;
INSERT INTO `CELL_ANTENNA` VALUES (1,1,1,1,'1-4','2026-09-28 08:15:11.565',1,'2026-09-28 08:15:11.565',1,0),(2,1,2,2,'1-4','2026-09-28 08:15:11.565',1,'2026-09-28 08:15:11.565',1,0);
/*!40000 ALTER TABLE `CELL_ANTENNA` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `CELL_RADIO_UNIT`
--

DROP TABLE IF EXISTS `CELL_RADIO_UNIT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CELL_RADIO_UNIT` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RADIO_CELL_ID_FK` int unsigned NOT NULL COMMENT 'FK RADIO_CELL.ID',
  `RADIO_UNIT_NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID of type RADIO_UNIT',
  `RADIO_UNIT_NETWORK_ELEMENT_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'RADIO_UNIT' COMMENT 'Constant RADIO_UNIT: FK-binds the NE to that type',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_CELL_RADIO_UNIT__RADIO_CELL_ID_RADIO_UNIT_NETWORK_ELEMENT_ID` (`CUSTOMER_ID`,`RADIO_CELL_ID_FK`,`RADIO_UNIT_NETWORK_ELEMENT_ID_FK`),
  KEY `IDX_CELL_RADIO_UNIT__RADIO_UNIT` (`CUSTOMER_ID`,`RADIO_UNIT_NETWORK_ELEMENT_ID_FK`,`RADIO_UNIT_NETWORK_ELEMENT_TYPE`),
  CONSTRAINT `FK_CELL_RADIO_UNIT__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_CELL_RADIO_UNIT__RADIO_CELL_ID` FOREIGN KEY (`CUSTOMER_ID`, `RADIO_CELL_ID_FK`) REFERENCES `RADIO_CELL` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `FK_CELL_RADIO_UNIT__RADIO_UNIT` FOREIGN KEY (`CUSTOMER_ID`, `RADIO_UNIT_NETWORK_ELEMENT_ID_FK`, `RADIO_UNIT_NETWORK_ELEMENT_TYPE`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`, `NETWORK_ELEMENT_TYPE`),
  CONSTRAINT `CK_CELL_RADIO_UNIT__RADIO_UNIT_TYPE` CHECK ((`RADIO_UNIT_NETWORK_ELEMENT_TYPE` = _utf8mb4'RADIO_UNIT'))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Radio unit(s) (RRU / RRH / AAU, NE type RADIO_UNIT) that transmit a cell; one RU carries many cells. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `CELL_RADIO_UNIT`
--

LOCK TABLES `CELL_RADIO_UNIT` WRITE;
/*!40000 ALTER TABLE `CELL_RADIO_UNIT` DISABLE KEYS */;
INSERT INTO `CELL_RADIO_UNIT` VALUES (1,1,1,5,'RADIO_UNIT','2026-09-28 08:15:11.566',1,'2026-09-28 08:15:11.566',1,0);
/*!40000 ALTER TABLE `CELL_RADIO_UNIT` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `CLOUD_CLUSTER`
--

DROP TABLE IF EXISTS `CLOUD_CLUSTER`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CLOUD_CLUSTER` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID: this row''s supertype row (identity for relationships, external refs, attributes, reconciliation)',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'CLOUD_CLUSTER' COMMENT 'Constant CLOUD_CLUSTER: FK-bound to RESOURCE so the supertype row is of this type',
  `CODE` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Subcloud code',
  `SITE_ID_FK` int unsigned NOT NULL COMMENT 'FK SITE.ID: hosting data centre / site',
  `PLATFORM` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'KUBERNETES' COMMENT 'Virtualisation platform. Values: KUBERNETES, OPENSTACK, VMWARE, OTHER',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  `IS_DELETED` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Soft-delete flag (0 = active, 1 = deleted)',
  `LIVE_FLAG` tinyint(1) GENERATED ALWAYS AS (if((`IS_DELETED` = 0),1,NULL)) STORED COMMENT '1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_CLOUD_CLUSTER__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_CLOUD_CLUSTER__SITE_ID_ID` (`CUSTOMER_ID`,`SITE_ID_FK`,`ID`),
  UNIQUE KEY `UK_CLOUD_CLUSTER__RESOURCE_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`RESOURCE_TYPE`),
  UNIQUE KEY `UK_CLOUD_CLUSTER__CODE` (`CUSTOMER_ID`,`CODE`,`LIVE_FLAG`),
  CONSTRAINT `FK_CLOUD_CLUSTER__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_CLOUD_CLUSTER__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `FK_CLOUD_CLUSTER__SITE_ID` FOREIGN KEY (`CUSTOMER_ID`, `SITE_ID_FK`) REFERENCES `SITE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_CLOUD_CLUSTER__PLATFORM_VALUES` CHECK ((`PLATFORM` in (_utf8mb4'KUBERNETES',_utf8mb4'OPENSTACK',_utf8mb4'VMWARE',_utf8mb4'OTHER'))),
  CONSTRAINT `CK_CLOUD_CLUSTER__RESOURCE_TYPE` CHECK ((`RESOURCE_TYPE` = _utf8mb4'CLOUD_CLUSTER'))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Edge cloud / subcloud that hosts virtual network functions (KA-BGLK-277-CL-04). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `CLOUD_CLUSTER`
--

LOCK TABLES `CLOUD_CLUSTER` WRITE;
/*!40000 ALTER TABLE `CLOUD_CLUSTER` DISABLE KEYS */;
INSERT INTO `CLOUD_CLUSTER` (`ID`, `CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`, `CODE`, `SITE_ID_FK`, `PLATFORM`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`, `IS_DELETED`) VALUES (1,1,15,'CLOUD_CLUSTER','KA-BLRD-001-CL-01',3,'KUBERNETES','2026-09-28 08:15:11.547',1,'2026-09-28 08:15:11.547',1,0,0);
/*!40000 ALTER TABLE `CLOUD_CLUSTER` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `COLLECTOR`
--

DROP TABLE IF EXISTS `COLLECTOR`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `COLLECTOR` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `CODE` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Collector name',
  `DOMAIN_ID_FK` smallint unsigned DEFAULT NULL COMMENT 'FK DOMAIN.ID: domain it serves; NULL = any',
  `HOST_ADDRESS` varchar(45) DEFAULT NULL COMMENT 'Collector address',
  `STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'OFFLINE' COMMENT 'Health, from check-ins. Values: ONLINE, HIGH_LATENCY, OFFLINE',
  `P95_RESPONSE_MS` int unsigned DEFAULT NULL COMMENT 'p95 target response time, ms',
  `LAST_CHECKIN_TIME` datetime(3) DEFAULT NULL COMMENT 'Last heartbeat (UTC)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  `IS_DELETED` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Soft-delete flag (0 = active, 1 = deleted)',
  `LIVE_FLAG` tinyint(1) GENERATED ALWAYS AS (if((`IS_DELETED` = 0),1,NULL)) STORED COMMENT '1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_COLLECTOR__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_COLLECTOR__CODE` (`CUSTOMER_ID`,`CODE`,`LIVE_FLAG`),
  KEY `IDX_COLLECTOR__DOMAIN_ID` (`DOMAIN_ID_FK`),
  CONSTRAINT `FK_COLLECTOR__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_COLLECTOR__DOMAIN_ID` FOREIGN KEY (`DOMAIN_ID_FK`) REFERENCES `DOMAIN` (`ID`),
  CONSTRAINT `CK_COLLECTOR__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'ONLINE',_utf8mb4'HIGH_LATENCY',_utf8mb4'OFFLINE')))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Collector node that executes scans (clr-blr-02, Collector-West). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `COLLECTOR`
--

LOCK TABLES `COLLECTOR` WRITE;
/*!40000 ALTER TABLE `COLLECTOR` DISABLE KEYS */;
INSERT INTO `COLLECTOR` (`ID`, `CUSTOMER_ID`, `CODE`, `DOMAIN_ID_FK`, `HOST_ADDRESS`, `STATUS`, `P95_RESPONSE_MS`, `LAST_CHECKIN_TIME`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`, `IS_DELETED`) VALUES (1,1,'clr-blr-02',4,'10.20.0.52','ONLINE',420,'2026-09-25 02:11:00.000','2026-09-28 08:15:11.576',1,'2026-09-28 08:15:11.576',1,0,0),(2,1,'clr-blr-ran-01',1,'10.40.0.11','HIGH_LATENCY',2100,'2026-09-25 02:09:30.000','2026-09-28 08:15:11.576',1,'2026-09-28 08:15:11.576',1,0,0);
/*!40000 ALTER TABLE `COLLECTOR` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `CREDENTIAL_PROFILE`
--

DROP TABLE IF EXISTS `CREDENTIAL_PROFILE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CREDENTIAL_PROFILE` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `CODE` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Profile name',
  `ACCESS_PROTOCOL` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Protocol the profile authenticates. Values: SNMP_V2C, SNMP_V3, NETCONF, SSH_CLI, TL1, REST',
  `ACCESS_MODE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'READ_ONLY' COMMENT 'Access level. Values: READ_ONLY, READ_WRITE',
  `NETWORK_PATH` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'IN_BAND' COMMENT 'Management path. Values: IN_BAND, OUT_OF_BAND',
  `VAULT_REFERENCE` varchar(200) NOT NULL COMMENT 'Vault path / id of the secret material (same pattern as the old SNMP_CREDENTIAL_REFERENCE)',
  `DOMAIN_ID_FK` smallint unsigned DEFAULT NULL COMMENT 'FK DOMAIN.ID: domain the profile is bound to; NULL = any',
  `OPERATIONAL_AREA_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK OPERATIONAL_AREA.ID: circle the profile is bound to; NULL = any',
  `EXPIRES_DATE` date DEFAULT NULL COMMENT 'Credential expiry; expired profiles are the AUTH failure root cause',
  `STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'HEALTHY' COMMENT 'Profile health. Values: HEALTHY, WARNING, EXPIRED',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  `IS_DELETED` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Soft-delete flag (0 = active, 1 = deleted)',
  `LIVE_FLAG` tinyint(1) GENERATED ALWAYS AS (if((`IS_DELETED` = 0),1,NULL)) STORED COMMENT '1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_CREDENTIAL_PROFILE__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_CREDENTIAL_PROFILE__CODE` (`CUSTOMER_ID`,`CODE`,`LIVE_FLAG`),
  KEY `IDX_CREDENTIAL_PROFILE__OPERATIONAL_AREA_ID` (`CUSTOMER_ID`,`OPERATIONAL_AREA_ID_FK`),
  KEY `IDX_CREDENTIAL_PROFILE__DOMAIN_ID` (`DOMAIN_ID_FK`),
  CONSTRAINT `FK_CREDENTIAL_PROFILE__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_CREDENTIAL_PROFILE__DOMAIN_ID` FOREIGN KEY (`DOMAIN_ID_FK`) REFERENCES `DOMAIN` (`ID`),
  CONSTRAINT `FK_CREDENTIAL_PROFILE__OPERATIONAL_AREA_ID` FOREIGN KEY (`CUSTOMER_ID`, `OPERATIONAL_AREA_ID_FK`) REFERENCES `OPERATIONAL_AREA` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_CREDENTIAL_PROFILE__ACCESS_MODE_VALUES` CHECK ((`ACCESS_MODE` in (_utf8mb4'READ_ONLY',_utf8mb4'READ_WRITE'))),
  CONSTRAINT `CK_CREDENTIAL_PROFILE__ACCESS_PROTOCOL_VALUES` CHECK ((`ACCESS_PROTOCOL` in (_utf8mb4'SNMP_V2C',_utf8mb4'SNMP_V3',_utf8mb4'NETCONF',_utf8mb4'SSH_CLI',_utf8mb4'TL1',_utf8mb4'REST'))),
  CONSTRAINT `CK_CREDENTIAL_PROFILE__NETWORK_PATH_VALUES` CHECK ((`NETWORK_PATH` in (_utf8mb4'IN_BAND',_utf8mb4'OUT_OF_BAND'))),
  CONSTRAINT `CK_CREDENTIAL_PROFILE__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'HEALTHY',_utf8mb4'WARNING',_utf8mb4'EXPIRED')))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Named access profile used by scans (ro-inband-v3). Holds only a vault reference: the secret, SNMPv3 user and keys never enter this database. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `CREDENTIAL_PROFILE`
--

LOCK TABLES `CREDENTIAL_PROFILE` WRITE;
/*!40000 ALTER TABLE `CREDENTIAL_PROFILE` DISABLE KEYS */;
INSERT INTO `CREDENTIAL_PROFILE` (`ID`, `CUSTOMER_ID`, `CODE`, `ACCESS_PROTOCOL`, `ACCESS_MODE`, `NETWORK_PATH`, `VAULT_REFERENCE`, `DOMAIN_ID_FK`, `OPERATIONAL_AREA_ID_FK`, `EXPIRES_DATE`, `STATUS`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`, `IS_DELETED`) VALUES (1,1,'ro-inband-v3','SNMP_V3','READ_ONLY','IN_BAND','kv/inventory/snmp/ro-inband-v3',4,2,'2027-03-31','HEALTHY','2026-09-28 08:15:11.577',1,'2026-09-28 08:15:11.577',1,0,0),(2,1,'enm-api-ro','REST','READ_ONLY','OUT_OF_BAND','kv/inventory/enm/api-ro',1,2,'2026-10-15','WARNING','2026-09-28 08:15:11.577',1,'2026-09-28 08:15:11.577',1,0,0);
/*!40000 ALTER TABLE `CREDENTIAL_PROFILE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `DISCOVERY_STEP_DEFINITION`
--

DROP TABLE IF EXISTS `DISCOVERY_STEP_DEFINITION`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DISCOVERY_STEP_DEFINITION` (
  `ID` smallint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK (metadata table)',
  `DOMAIN_ID_FK` smallint unsigned NOT NULL COMMENT 'FK DOMAIN.ID: network domain (RAN, Core, Transport, Transport > IP/MPLS); one dimension shared by Discovery, Reconciliation and Inventory',
  `CODE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Step key (device, hardware, lldp, radio, registration ...)',
  `NAME` varchar(64) NOT NULL COMMENT 'Display name',
  `SEQUENCE_NUMBER` smallint unsigned NOT NULL COMMENT 'Order in the chain; a failed step skips the later dependent steps',
  `PROTOCOL` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Protocol used. Values: ICMP, SNMP_V2C, SNMP_V3, NETCONF, CLI, LLDP_CDP, TL1, REST, X2_XN_ANR',
  `WRITES` varchar(255) NOT NULL COMMENT 'What the step writes to inventory (NE identity, hardware, adjacencies, services)',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_DISCOVERY_STEP_DEFINITION__DOMAIN_ID_CODE` (`DOMAIN_ID_FK`,`CODE`),
  UNIQUE KEY `UK_DISCOVERY_STEP_DEFINITION__DOMAIN_ID_SEQUENCE_NUMBER` (`DOMAIN_ID_FK`,`SEQUENCE_NUMBER`),
  CONSTRAINT `FK_DISCOVERY_STEP_DEFINITION__DOMAIN_ID` FOREIGN KEY (`DOMAIN_ID_FK`) REFERENCES `DOMAIN` (`ID`),
  CONSTRAINT `CK_DISCOVERY_STEP_DEFINITION__PROTOCOL_VALUES` CHECK ((`PROTOCOL` in (_utf8mb4'ICMP',_utf8mb4'SNMP_V2C',_utf8mb4'SNMP_V3',_utf8mb4'NETCONF',_utf8mb4'CLI',_utf8mb4'LLDP_CDP',_utf8mb4'TL1',_utf8mb4'REST',_utf8mb4'X2_XN_ANR')))
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Collector step of a domain family, in execution order (Transport: device, hardware, lldp, ospf, bgp, service ...). FK to DOMAIN added (missing in v4). [v6, 2026-09-28]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `DISCOVERY_STEP_DEFINITION`
--

LOCK TABLES `DISCOVERY_STEP_DEFINITION` WRITE;
/*!40000 ALTER TABLE `DISCOVERY_STEP_DEFINITION` DISABLE KEYS */;
INSERT INTO `DISCOVERY_STEP_DEFINITION` VALUES (1,4,'reachability','Reachability',1,'ICMP','NETWORK_ELEMENT_HEALTH'),(2,4,'device','Device identity',2,'SNMP_V3','NETWORK_ELEMENT'),(3,4,'hardware','Hardware inventory',3,'SNMP_V3','EQUIPMENT_COMPONENT'),(4,4,'interface','Interfaces',4,'SNMP_V3','PORT, PORT_IP_ADDRESS'),(5,4,'lldp','LLDP neighbours',5,'LLDP_CDP','LINK (LLDP)'),(6,4,'bgp','BGP sessions',6,'NETCONF','LINK (BGP), LINK_PROTOCOL_ATTRIBUTE'),(7,4,'service','L2/L3 VPN services',7,'NETCONF','SERVICE_INSTANCE, SERVICE_ENDPOINT, VRF'),(11,1,'node','RAN node export',1,'REST','NETWORK_ELEMENT, NETWORK_ELEMENT_RAN_DETAIL'),(12,1,'cell','Cell parameters',2,'REST','RADIO_CELL, RADIO_CELL_PLMN'),(13,1,'neighbour','X2 / Xn neighbours',3,'X2_XN_ANR','LINK (X2, XN)'),(21,5,'node','Optical node',1,'TL1','NETWORK_ELEMENT, NETWORK_ELEMENT_OPTICAL_DETAIL'),(22,5,'wavelength','Wavelength services',2,'TL1','LINK (OCH), SERVICE_INSTANCE');
/*!40000 ALTER TABLE `DISCOVERY_STEP_DEFINITION` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `DISCREPANCY_TYPE`
--

DROP TABLE IF EXISTS `DISCREPANCY_TYPE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DISCREPANCY_TYPE` (
  `ID` smallint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK (metadata table)',
  `CODE` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Type code',
  `LABEL` varchar(100) NOT NULL COMMENT 'Display label',
  `CATEGORY` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Discrepancy category. Values: EXISTENCE, ATTRIBUTE, RELATIONSHIP, FRESHNESS',
  `DOMAIN_ID_FK` smallint unsigned NOT NULL COMMENT 'FK DOMAIN.ID: network domain (RAN, Core, Transport, Transport > IP/MPLS); one dimension shared by Discovery, Reconciliation and Inventory',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_DISCREPANCY_TYPE__CODE` (`CODE`),
  KEY `IDX_DISCREPANCY_TYPE__DOMAIN_ID` (`DOMAIN_ID_FK`),
  CONSTRAINT `FK_DISCREPANCY_TYPE__DOMAIN_ID` FOREIGN KEY (`DOMAIN_ID_FK`) REFERENCES `DOMAIN` (`ID`),
  CONSTRAINT `CK_DISCREPANCY_TYPE__CATEGORY_VALUES` CHECK ((`CATEGORY` in (_utf8mb4'EXISTENCE',_utf8mb4'ATTRIBUTE',_utf8mb4'RELATIONSHIP',_utf8mb4'FRESHNESS')))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Discrepancy label with its category and domain (Undocumented wavelength, PCI value != record, Topology gap (LLDP) ...). FK to DOMAIN added (missing in v4). [v6, 2026-09-28]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `DISCREPANCY_TYPE`
--

LOCK TABLES `DISCREPANCY_TYPE` WRITE;
/*!40000 ALTER TABLE `DISCREPANCY_TYPE` DISABLE KEYS */;
INSERT INTO `DISCREPANCY_TYPE` VALUES (1,'UNDOCUMENTED_WAVELENGTH','Undocumented wavelength','EXISTENCE',5),(2,'PCI_MISMATCH','PCI value != record','ATTRIBUTE',1),(3,'TOPOLOGY_GAP_LLDP','Topology gap (LLDP)','RELATIONSHIP',4),(4,'STALE_DEVICE','Device not seen in 30 days','FRESHNESS',4),(5,'ROGUE_DEVICE','Device without record','EXISTENCE',4),(6,'OS_VERSION_DRIFT','OS version != golden','ATTRIBUTE',4);
/*!40000 ALTER TABLE `DISCREPANCY_TYPE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `DOMAIN`
--

DROP TABLE IF EXISTS `DOMAIN`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DOMAIN` (
  `ID` smallint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK (metadata table)',
  `CODE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Stable domain code (RAN, CORE, TRANSPORT, IP_MPLS); the value the application enum carries',
  `NAME` varchar(50) NOT NULL COMMENT 'Display name (IP/MPLS)',
  `PARENT_DOMAIN_ID_FK` smallint unsigned DEFAULT NULL COMMENT 'FK DOMAIN.ID: parent domain (IP_MPLS -> TRANSPORT); NULL for a top-level domain. One level deep by application rule',
  `SORT_ORDER` tinyint unsigned NOT NULL COMMENT 'Display order; a child directly follows its parent (RAN, Core, Transport, IP/MPLS)',
  `IS_ACTIVE` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1 when selectable for new records',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_DOMAIN__CODE` (`CODE`),
  UNIQUE KEY `UK_DOMAIN__SORT_ORDER` (`SORT_ORDER`),
  KEY `IDX_DOMAIN__PARENT_DOMAIN_ID` (`PARENT_DOMAIN_ID_FK`),
  CONSTRAINT `FK_DOMAIN__PARENT_DOMAIN_ID` FOREIGN KEY (`PARENT_DOMAIN_ID_FK`) REFERENCES `DOMAIN` (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Network-domain taxonomy shared by Discovery, Reconciliation and Inventory; a one-level tree (IP/MPLS under Transport). Seeded; global. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `DOMAIN`
--

LOCK TABLES `DOMAIN` WRITE;
/*!40000 ALTER TABLE `DOMAIN` DISABLE KEYS */;
INSERT INTO `DOMAIN` VALUES (1,'RAN','RAN',NULL,1,1),(2,'CORE','Core',NULL,2,1),(3,'TRANSPORT','Transport',NULL,3,1),(4,'IP_MPLS','IP/MPLS',3,4,1),(5,'OPTICAL','Optical',3,5,1),(6,'MICROWAVE','Microwave',3,6,1),(7,'FIXED_ACCESS','Fixed access',NULL,7,1),(8,'IT_CLOUD','IT / cloud',NULL,8,1),(9,'FACILITY','Site facility',NULL,9,1);
/*!40000 ALTER TABLE `DOMAIN` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `DOMAIN_TRUST_SNAPSHOT`
--

DROP TABLE IF EXISTS `DOMAIN_TRUST_SNAPSHOT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DOMAIN_TRUST_SNAPSHOT` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `SNAPSHOT_DATE` date NOT NULL COMMENT 'Snapshot day',
  `DOMAIN_ID_FK` smallint unsigned NOT NULL COMMENT 'FK DOMAIN.ID: network domain (RAN, Core, Transport, Transport > IP/MPLS); one dimension shared by Discovery, Reconciliation and Inventory',
  `IN_SCOPE` int unsigned NOT NULL COMMENT 'Records in scope',
  `IN_SYNC` int unsigned NOT NULL COMMENT 'Records whose identity, attributes and relationships agree',
  `UNVERIFIED` int unsigned DEFAULT NULL COMMENT 'Never verified',
  `OPEN_EXCEPTIONS` int unsigned NOT NULL COMMENT 'Open exceptions',
  `MTTR_HOURS` decimal(8,2) DEFAULT NULL COMMENT 'Mean time to resolve, hours',
  `TOUCHLESS_PERCENT` decimal(5,2) DEFAULT NULL COMMENT 'Share closed without an engineer, %',
  `TRUST_INDEX_PERCENT` decimal(5,2) GENERATED ALWAYS AS (if((`IN_SCOPE` = 0),NULL,round(((100 * `IN_SYNC`) / `IN_SCOPE`),2))) STORED COMMENT 'Derived: in sync / in scope',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_DOMAIN_TRUST_SNAPSHOT__SNAPSHOT_DATE_DOMAIN_ID` (`CUSTOMER_ID`,`SNAPSHOT_DATE`,`DOMAIN_ID_FK`),
  KEY `IDX_DOMAIN_TRUST_SNAPSHOT__DOMAIN_ID` (`DOMAIN_ID_FK`),
  CONSTRAINT `FK_DOMAIN_TRUST_SNAPSHOT__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_DOMAIN_TRUST_SNAPSHOT__DOMAIN_ID` FOREIGN KEY (`DOMAIN_ID_FK`) REFERENCES `DOMAIN` (`ID`),
  CONSTRAINT `CK_DOMAIN_TRUST_SNAPSHOT__COUNTS` CHECK (((`IN_SYNC` <= `IN_SCOPE`) and ((`TOUCHLESS_PERCENT` is null) or (`TOUCHLESS_PERCENT` between 0 and 100)))),
  CONSTRAINT `CK_DOMAIN_TRUST_SNAPSHOT__MTTR_HOURS_NON_NEGATIVE` CHECK (((`MTTR_HOURS` is null) or (`MTTR_HOURS` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Daily snapshot of trust figures per domain, for trend charts (trust index, in sync, unverified, open, MTTR, touchless). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `DOMAIN_TRUST_SNAPSHOT`
--

LOCK TABLES `DOMAIN_TRUST_SNAPSHOT` WRITE;
/*!40000 ALTER TABLE `DOMAIN_TRUST_SNAPSHOT` DISABLE KEYS */;
INSERT INTO `DOMAIN_TRUST_SNAPSHOT` (`ID`, `CUSTOMER_ID`, `SNAPSHOT_DATE`, `DOMAIN_ID_FK`, `IN_SCOPE`, `IN_SYNC`, `UNVERIFIED`, `OPEN_EXCEPTIONS`, `MTTR_HOURS`, `TOUCHLESS_PERCENT`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`) VALUES (1,1,'2026-09-23',1,1240,1188,22,31,18.50,82.10,'2026-09-28 08:15:11.597',6,'2026-09-28 08:15:11.597',6,0),(2,1,'2026-09-24',1,1240,1191,20,29,18.20,82.60,'2026-09-28 08:15:11.597',6,'2026-09-28 08:15:11.597',6,0),(3,1,'2026-09-25',1,1242,1197,19,27,17.90,83.00,'2026-09-28 08:15:11.597',6,'2026-09-28 08:15:11.597',6,0),(4,1,'2026-09-23',4,388,371,6,11,9.40,88.00,'2026-09-28 08:15:11.597',6,'2026-09-28 08:15:11.597',6,0),(5,1,'2026-09-24',4,388,372,6,10,9.10,88.30,'2026-09-28 08:15:11.597',6,'2026-09-28 08:15:11.597',6,0),(6,1,'2026-09-25',4,389,374,5,10,8.90,88.70,'2026-09-28 08:15:11.597',6,'2026-09-28 08:15:11.597',6,0),(7,1,'2026-09-25',5,96,80,4,12,26.00,61.00,'2026-09-28 08:15:11.597',6,'2026-09-28 08:15:11.597',6,0);
/*!40000 ALTER TABLE `DOMAIN_TRUST_SNAPSHOT` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `EQUIPMENT_COMPONENT`
--

DROP TABLE IF EXISTS `EQUIPMENT_COMPONENT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `EQUIPMENT_COMPONENT` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID: this row''s supertype row (identity for relationships, external refs, attributes, reconciliation)',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'EQUIPMENT_COMPONENT' COMMENT 'Constant EQUIPMENT_COMPONENT: FK-bound to RESOURCE so the supertype row is of this type',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID',
  `PARENT_COMPONENT_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK EQUIPMENT_COMPONENT.ID: containing component of the same device; NULL for the chassis',
  `COMPONENT_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Component type. Values: CHASSIS, SHELF, SLOT, SUBSLOT, ROUTING_ENGINE, CONTROL_CARD, LINE_CARD, BASEBAND_CARD, PIC, MODULE, TRANSCEIVER, PSU, FAN, OTHER',
  `NAME` varchar(100) NOT NULL COMMENT 'Name as reported (FPC 0, PIC 0/0, PEM 1, Slot 3); unique per device among active rows',
  `SLOT_POSITION` varchar(32) DEFAULT NULL COMMENT 'Slot / position (0/0, OT-1 slot 4)',
  `VENDOR_ID_FK` smallint unsigned DEFAULT NULL COMMENT 'FK VENDOR.ID of the component (optics are often third-party)',
  `PRODUCT_MODEL_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK PRODUCT_MODEL.ID once PART_NUMBER is matched to the catalog; FK-bound to VENDOR_ID_FK',
  `PART_NUMBER` varchar(64) DEFAULT NULL COMMENT 'Part number exactly as reported (MPC7E-10G, SFP+-10G-LR); kept even when unmatched',
  `SERIAL_NUMBER` varchar(64) DEFAULT NULL COMMENT 'Serial number',
  `HARDWARE_REVISION` varchar(16) DEFAULT NULL COMMENT 'Hardware revision',
  `MANUFACTURE_DATE` date DEFAULT NULL COMMENT 'Manufacture date',
  `STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'UNKNOWN' COMMENT 'Component status (EMPTY only for SLOT / SUBSLOT). Values: ONLINE, DEGRADING, FAILED, EMPTY, UNKNOWN',
  `RECORD_STATE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'ACTIVE' COMMENT 'INACTIVE = no longer reported (Inactive inventory > Hardware). Values: ACTIVE, INACTIVE',
  `INACTIVE_TIME` datetime(3) DEFAULT NULL COMMENT 'When it went inactive (UTC)',
  `LAST_SEEN_TIME` datetime(3) DEFAULT NULL COMMENT 'Last discovery that reported it (UTC)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  `ACTIVE_FLAG` tinyint(1) GENERATED ALWAYS AS (if((`RECORD_STATE` = _utf8mb4'ACTIVE'),1,NULL)) STORED COMMENT '1 while ACTIVE, NULL once INACTIVE: UNIQUE keys ending in ACTIVE_FLAG ignore retired rows',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_EQUIPMENT_COMPONENT__NETWORK_ELEMENT_ID_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`ID`),
  UNIQUE KEY `UK_EQUIPMENT_COMPONENT__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_EQUIPMENT_COMPONENT__RESOURCE_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`RESOURCE_TYPE`),
  UNIQUE KEY `UK_EQUIPMENT_COMPONENT__NETWORK_ELEMENT_ID_NAME` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`NAME`,`ACTIVE_FLAG`),
  KEY `IDX_EQUIPMENT_COMPONENT__PARENT` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`PARENT_COMPONENT_ID_FK`),
  KEY `IDX_EQUIPMENT_COMPONENT__NETWORK_ELEMENT_ID_COMPONENT_TYPE` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`COMPONENT_TYPE`),
  KEY `IDX_EQUIPMENT_COMPONENT__SERIAL_NUMBER` (`CUSTOMER_ID`,`SERIAL_NUMBER`),
  KEY `IDX_EQUIPMENT_COMPONENT__VENDOR_ID_FK` (`VENDOR_ID_FK`),
  KEY `IDX_EQUIPMENT_COMPONENT__VENDOR_ID_PRODUCT_MODEL_ID` (`VENDOR_ID_FK`,`PRODUCT_MODEL_ID_FK`),
  CONSTRAINT `FK_EQUIPMENT_COMPONENT__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_EQUIPMENT_COMPONENT__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_EQUIPMENT_COMPONENT__PARENT` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `PARENT_COMPONENT_ID_FK`) REFERENCES `EQUIPMENT_COMPONENT` (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `ID`),
  CONSTRAINT `FK_EQUIPMENT_COMPONENT__PRODUCT_MODEL_ID` FOREIGN KEY (`VENDOR_ID_FK`, `PRODUCT_MODEL_ID_FK`) REFERENCES `PRODUCT_MODEL` (`VENDOR_ID_FK`, `ID`),
  CONSTRAINT `FK_EQUIPMENT_COMPONENT__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `FK_EQUIPMENT_COMPONENT__VENDOR_ID` FOREIGN KEY (`VENDOR_ID_FK`) REFERENCES `VENDOR` (`ID`),
  CONSTRAINT `CK_EQUIPMENT_COMPONENT__COMPONENT_TYPE_VALUES` CHECK ((`COMPONENT_TYPE` in (_utf8mb4'CHASSIS',_utf8mb4'SHELF',_utf8mb4'SLOT',_utf8mb4'SUBSLOT',_utf8mb4'ROUTING_ENGINE',_utf8mb4'CONTROL_CARD',_utf8mb4'LINE_CARD',_utf8mb4'BASEBAND_CARD',_utf8mb4'PIC',_utf8mb4'MODULE',_utf8mb4'TRANSCEIVER',_utf8mb4'PSU',_utf8mb4'FAN',_utf8mb4'OTHER'))),
  CONSTRAINT `CK_EQUIPMENT_COMPONENT__EMPTY_SLOT` CHECK (((`STATUS` <> _utf8mb4'EMPTY') or (`COMPONENT_TYPE` in (_utf8mb4'SLOT',_utf8mb4'SUBSLOT')))),
  CONSTRAINT `CK_EQUIPMENT_COMPONENT__INACTIVE` CHECK (((`RECORD_STATE` = _utf8mb4'INACTIVE') = (`INACTIVE_TIME` is not null))),
  CONSTRAINT `CK_EQUIPMENT_COMPONENT__MODEL_NEEDS_VENDOR` CHECK (((`PRODUCT_MODEL_ID_FK` is null) or (`VENDOR_ID_FK` is not null))),
  CONSTRAINT `CK_EQUIPMENT_COMPONENT__RECORD_STATE_VALUES` CHECK ((`RECORD_STATE` in (_utf8mb4'ACTIVE',_utf8mb4'INACTIVE'))),
  CONSTRAINT `CK_EQUIPMENT_COMPONENT__RESOURCE_TYPE` CHECK ((`RESOURCE_TYPE` = _utf8mb4'EQUIPMENT_COMPONENT')),
  CONSTRAINT `CK_EQUIPMENT_COMPONENT__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'ONLINE',_utf8mb4'DEGRADING',_utf8mb4'FAILED',_utf8mb4'EMPTY',_utf8mb4'UNKNOWN')))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Hardware tree inside a device, including empty slots; parents are FK-bound to the same device. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `EQUIPMENT_COMPONENT`
--

LOCK TABLES `EQUIPMENT_COMPONENT` WRITE;
/*!40000 ALTER TABLE `EQUIPMENT_COMPONENT` DISABLE KEYS */;
INSERT INTO `EQUIPMENT_COMPONENT` (`ID`, `CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`, `NETWORK_ELEMENT_ID_FK`, `PARENT_COMPONENT_ID_FK`, `COMPONENT_TYPE`, `NAME`, `SLOT_POSITION`, `VENDOR_ID_FK`, `PRODUCT_MODEL_ID_FK`, `PART_NUMBER`, `SERIAL_NUMBER`, `HARDWARE_REVISION`, `MANUFACTURE_DATE`, `STATUS`, `RECORD_STATE`, `INACTIVE_TIME`, `LAST_SEEN_TIME`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`) VALUES (1,1,41,'EQUIPMENT_COMPONENT',1,NULL,'CHASSIS','Chassis',NULL,1,1,'ASR-9906','FOX2233A1B7',NULL,NULL,'ONLINE','ACTIVE',NULL,'2026-09-25 01:58:03.000','2026-09-28 08:15:11.556',6,'2026-09-28 08:15:11.556',6,0),(2,1,42,'EQUIPMENT_COMPONENT',1,1,'LINE_CARD','0/0/CPU0','0/0',1,7,'A9K-8X100GE-SE','FOC2301LC01',NULL,NULL,'ONLINE','ACTIVE',NULL,'2026-09-25 01:58:03.000','2026-09-28 08:15:11.556',6,'2026-09-28 08:15:11.556',6,0),(3,1,43,'EQUIPMENT_COMPONENT',1,2,'TRANSCEIVER','HundredGigE0/0/0/0 optic','0/0/0/0',1,8,'QSFP-100G-LR4-S','FNS23110X01',NULL,NULL,'ONLINE','ACTIVE',NULL,'2026-09-25 01:58:03.000','2026-09-28 08:15:11.556',6,'2026-09-28 08:15:11.556',6,0);
/*!40000 ALTER TABLE `EQUIPMENT_COMPONENT` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `EXTERNAL_ENTITY_TYPE`
--

DROP TABLE IF EXISTS `EXTERNAL_ENTITY_TYPE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `EXTERNAL_ENTITY_TYPE` (
  `CODE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Object type code',
  `SYSTEM_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'EXTERNAL_SYSTEM.SYSTEM_TYPE that owns objects of this type (FIBER_INVENTORY ...)',
  `NAME` varchar(64) NOT NULL COMMENT 'Display name',
  PRIMARY KEY (`CODE`),
  UNIQUE KEY `UK_EXTERNAL_ENTITY_TYPE__CODE_SYSTEM_TYPE` (`CODE`,`SYSTEM_TYPE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Type of externally owned entity (fiber span, passive asset, CMDB item ...) that may be proxied here. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `EXTERNAL_ENTITY_TYPE`
--

LOCK TABLES `EXTERNAL_ENTITY_TYPE` WRITE;
/*!40000 ALTER TABLE `EXTERNAL_ENTITY_TYPE` DISABLE KEYS */;
INSERT INTO `EXTERNAL_ENTITY_TYPE` VALUES ('CAPEX_PLAN','FINANCE','Capex plan'),('CI','CMDB','Configuration item'),('CUSTOMER_ORDER','CRM','Customer order'),('DUCT','FIBER_INVENTORY','Duct'),('FIBER_CABLE','FIBER_INVENTORY','Fiber cable'),('FIBER_CIRCUIT','FIBER_INVENTORY','Fiber circuit / path'),('FIBER_SPAN','FIBER_INVENTORY','Fiber span'),('FIBER_STRAND','FIBER_INVENTORY','Fiber strand / core'),('LCM_SERVICE','LCM','Provisioned service'),('ODN_SPLITTER','FIBER_INVENTORY','ODN splitter'),('OPEX_PLAN','FINANCE','Opex plan'),('PASSIVE_ASSET','PASSIVE_INVENTORY','Passive asset (tower, shelter, ODF, cabinet ...)'),('PASSIVE_PORT','PASSIVE_INVENTORY','Passive port (ODF / DDF position)'),('PATCH_CORD','PASSIVE_INVENTORY','Patch cord'),('POWER_UNIT','PASSIVE_INVENTORY','Power unit (DG, rectifier, battery, UPS, solar)'),('RACK','PASSIVE_INVENTORY','Rack (when Passive Inventory owns racks)'),('SPLICE_CLOSURE','FIBER_INVENTORY','Splice closure');
/*!40000 ALTER TABLE `EXTERNAL_ENTITY_TYPE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `EXTERNAL_RESOURCE`
--

DROP TABLE IF EXISTS `EXTERNAL_RESOURCE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `EXTERNAL_RESOURCE` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID: this row''s supertype row (identity for relationships, external refs, attributes, reconciliation)',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'EXTERNAL_RESOURCE' COMMENT 'Type of the proxied object, FK-bound to RESOURCE. EXTERNAL_RESOURCE for fiber plant / CMDB / CRM objects; PASSIVE_ASSET, PASSIVE_PORT or POWER_UNIT for objects owned by Passive Inventory (RESOURCE_TYPE.SUBTYPE_TABLE = EXTERNAL_RESOURCE)',
  `EXTERNAL_SYSTEM_ID_FK` int unsigned NOT NULL COMMENT 'FK EXTERNAL_SYSTEM.ID: owner of the object (fiber application, Passive Inventory, CMDB ...)',
  `SYSTEM_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Copy of EXTERNAL_SYSTEM.SYSTEM_TYPE, FK-bound so the object type fits the system',
  `ENTITY_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'FK EXTERNAL_ENTITY_TYPE.CODE (FIBER_CABLE, FIBER_SPAN, FIBER_STRAND, FIBER_CIRCUIT, DUCT ...)',
  `EXTERNAL_ID` varchar(128) NOT NULL COMMENT 'Immutable id of the object in the owning system',
  `DISPLAY_LABEL` varchar(150) DEFAULT NULL COMMENT 'Label cache for lists only (CKT-10021 / Span BLR-DEL-07); the owning system stays authoritative',
  `LAST_SYNC_TIME` datetime(3) DEFAULT NULL COMMENT 'Last time the id was confirmed to exist in the owning system (UTC)',
  `RECORD_STATE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'ACTIVE' COMMENT 'INACTIVE = no longer exists in the owning system. Values: ACTIVE, INACTIVE',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_EXTERNAL_RESOURCE__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_EXTERNAL_RESOURCE__RESOURCE_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`RESOURCE_TYPE`),
  UNIQUE KEY `UK_EXTERNAL_RESOURCE__SYSTEM_TYPE_EXTERNAL_ID` (`CUSTOMER_ID`,`EXTERNAL_SYSTEM_ID_FK`,`ENTITY_TYPE`,`EXTERNAL_ID`),
  KEY `IDX_EXTERNAL_RESOURCE__SYSTEM` (`CUSTOMER_ID`,`EXTERNAL_SYSTEM_ID_FK`,`SYSTEM_TYPE`),
  KEY `IDX_EXTERNAL_RESOURCE__ENTITY_TYPE` (`ENTITY_TYPE`,`SYSTEM_TYPE`),
  KEY `IDX_EXTERNAL_RESOURCE__EXTERNAL_ID` (`CUSTOMER_ID`,`EXTERNAL_ID`),
  CONSTRAINT `FK_EXTERNAL_RESOURCE__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_EXTERNAL_RESOURCE__ENTITY_TYPE` FOREIGN KEY (`ENTITY_TYPE`, `SYSTEM_TYPE`) REFERENCES `EXTERNAL_ENTITY_TYPE` (`CODE`, `SYSTEM_TYPE`),
  CONSTRAINT `FK_EXTERNAL_RESOURCE__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `FK_EXTERNAL_RESOURCE__SYSTEM` FOREIGN KEY (`CUSTOMER_ID`, `EXTERNAL_SYSTEM_ID_FK`, `SYSTEM_TYPE`) REFERENCES `EXTERNAL_SYSTEM` (`CUSTOMER_ID`, `ID`, `SYSTEM_TYPE`),
  CONSTRAINT `CK_EXTERNAL_RESOURCE__RECORD_STATE_VALUES` CHECK ((`RECORD_STATE` in (_utf8mb4'ACTIVE',_utf8mb4'INACTIVE'))),
  CONSTRAINT `CK_EXTERNAL_RESOURCE__RESOURCE_TYPE_VALUES` CHECK ((`RESOURCE_TYPE` in (_utf8mb4'EXTERNAL_RESOURCE',_utf8mb4'PASSIVE_ASSET',_utf8mb4'PASSIVE_PORT',_utf8mb4'POWER_UNIT')))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Lightweight proxy for an object owned by another system (fiber plant, Passive Inventory, CMDB, CRM); ids and a label cache only, no copied attributes. [v6, 2026-09-28]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `EXTERNAL_RESOURCE`
--

LOCK TABLES `EXTERNAL_RESOURCE` WRITE;
/*!40000 ALTER TABLE `EXTERNAL_RESOURCE` DISABLE KEYS */;
INSERT INTO `EXTERNAL_RESOURCE` VALUES (1,1,16,'PASSIVE_ASSET',1,'PASSIVE_INVENTORY','PASSIVE_ASSET','PA-TWR-000277','Tower TWR-1 @ KA-BGLK-277','2026-09-25 01:00:00.000','ACTIVE','2026-09-28 08:15:11.542',1,'2026-09-28 08:15:11.542',1,0),(2,1,17,'POWER_UNIT',1,'PASSIVE_INVENTORY','POWER_UNIT','PU-RECT-000277','Rectifier plant @ KA-BGLK-277','2026-09-25 01:00:00.000','ACTIVE','2026-09-28 08:15:11.542',1,'2026-09-28 08:15:11.542',1,0),(3,1,18,'EXTERNAL_RESOURCE',5,'FIBER_INVENTORY','FIBER_SPAN','SPAN-BLR-KOR-WHF-07','Span Koramangala - Whitefield 07','2026-09-24 22:00:00.000','ACTIVE','2026-09-28 08:15:11.542',1,'2026-09-28 08:15:11.542',1,0);
/*!40000 ALTER TABLE `EXTERNAL_RESOURCE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `EXTERNAL_SYSTEM`
--

DROP TABLE IF EXISTS `EXTERNAL_SYSTEM`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `EXTERNAL_SYSTEM` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `CODE` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'System code (NSP-SOUTH, U2020-RAN, SNOW-CMDB, FIBERNEO)',
  `NAME` varchar(100) NOT NULL COMMENT 'Display name',
  `SYSTEM_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Role of the system. Values: EMS, NMS, SDN_CONTROLLER, OSS_INVENTORY, CMDB, ERP, IAM, ITSM, ORCHESTRATOR, LCM, CRM, PLANNING, PM, FM, FIBER_INVENTORY, PASSIVE_INVENTORY, FINANCE, OTHER. IAM = User Management module (USER arrives by CDC); PASSIVE_INVENTORY = Passive Inventory module; FINANCE = Open / CoPEX module',
  `VENDOR_ID_FK` smallint unsigned DEFAULT NULL COMMENT 'FK VENDOR.ID: product vendor (Nokia NSP, Huawei U2020); NULL for in-house systems',
  `DOMAIN_ID_FK` smallint unsigned DEFAULT NULL COMMENT 'FK DOMAIN.ID: network domain the system manages; NULL = several / not network',
  `BASE_URL` varchar(255) DEFAULT NULL COMMENT 'API base URL / deep-link root used by the UI',
  `VAULT_REFERENCE` varchar(200) DEFAULT NULL COMMENT 'Vault path of the integration credential; never the secret',
  `IS_DISCOVERY_SOURCE` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 when scan jobs may use this system as their source (API-based discovery)',
  `STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'ACTIVE' COMMENT 'Integration state. Values: ACTIVE, SUSPENDED, RETIRED',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  `IS_DELETED` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Soft-delete flag (0 = active, 1 = deleted)',
  `LIVE_FLAG` tinyint(1) GENERATED ALWAYS AS (if((`IS_DELETED` = 0),1,NULL)) STORED COMMENT '1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_EXTERNAL_SYSTEM__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_EXTERNAL_SYSTEM__CUSTOMER_ID_ID_SYSTEM_TYPE` (`CUSTOMER_ID`,`ID`,`SYSTEM_TYPE`),
  UNIQUE KEY `UK_EXTERNAL_SYSTEM__CODE` (`CUSTOMER_ID`,`CODE`,`LIVE_FLAG`),
  KEY `IDX_EXTERNAL_SYSTEM__VENDOR_ID` (`VENDOR_ID_FK`),
  KEY `IDX_EXTERNAL_SYSTEM__DOMAIN_ID` (`DOMAIN_ID_FK`),
  CONSTRAINT `FK_EXTERNAL_SYSTEM__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_EXTERNAL_SYSTEM__DOMAIN_ID` FOREIGN KEY (`DOMAIN_ID_FK`) REFERENCES `DOMAIN` (`ID`),
  CONSTRAINT `FK_EXTERNAL_SYSTEM__VENDOR_ID` FOREIGN KEY (`VENDOR_ID_FK`) REFERENCES `VENDOR` (`ID`),
  CONSTRAINT `CK_EXTERNAL_SYSTEM__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'ACTIVE',_utf8mb4'SUSPENDED',_utf8mb4'RETIRED'))),
  CONSTRAINT `CK_EXTERNAL_SYSTEM__SYSTEM_TYPE_VALUES` CHECK ((`SYSTEM_TYPE` in (_utf8mb4'EMS',_utf8mb4'NMS',_utf8mb4'SDN_CONTROLLER',_utf8mb4'OSS_INVENTORY',_utf8mb4'CMDB',_utf8mb4'ERP',_utf8mb4'IAM',_utf8mb4'ITSM',_utf8mb4'ORCHESTRATOR',_utf8mb4'LCM',_utf8mb4'CRM',_utf8mb4'PLANNING',_utf8mb4'PM',_utf8mb4'FM',_utf8mb4'FIBER_INVENTORY',_utf8mb4'PASSIVE_INVENTORY',_utf8mb4'FINANCE',_utf8mb4'OTHER')))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Every external system this inventory exchanges data with, including discovery sources and the fiber application. System types added for Passive Inventory and Open / CoPEX (FINANCE). [v6, 2026-09-28]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `EXTERNAL_SYSTEM`
--

LOCK TABLES `EXTERNAL_SYSTEM` WRITE;
/*!40000 ALTER TABLE `EXTERNAL_SYSTEM` DISABLE KEYS */;
INSERT INTO `EXTERNAL_SYSTEM` (`ID`, `CUSTOMER_ID`, `CODE`, `NAME`, `SYSTEM_TYPE`, `VENDOR_ID_FK`, `DOMAIN_ID_FK`, `BASE_URL`, `VAULT_REFERENCE`, `IS_DISCOVERY_SOURCE`, `STATUS`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`, `IS_DELETED`) VALUES (1,1,'PASSIVE-INV','Passive Inventory module','PASSIVE_INVENTORY',NULL,NULL,'https://passive.netsingularity.local',NULL,0,'ACTIVE','2026-09-28 08:15:11.541',1,'2026-09-28 08:15:11.541',1,0,0),(2,1,'COPEX','Open / CoPEX module','FINANCE',NULL,NULL,'https://copex.netsingularity.local',NULL,0,'ACTIVE','2026-09-28 08:15:11.541',1,'2026-09-28 08:15:11.541',1,0,0),(3,1,'IAM','User Management','IAM',NULL,NULL,'https://iam.netsingularity.local',NULL,0,'ACTIVE','2026-09-28 08:15:11.541',1,'2026-09-28 08:15:11.541',1,0,0),(4,1,'ENM-RAN','Ericsson Network Manager','EMS',2,1,'https://enm-south.opco.local',NULL,1,'ACTIVE','2026-09-28 08:15:11.541',1,'2026-09-28 08:15:11.541',1,0,0),(5,1,'FIBER-APP','Fiber plant inventory','FIBER_INVENTORY',NULL,5,'https://fiber.opco.local',NULL,0,'ACTIVE','2026-09-28 08:15:11.541',1,'2026-09-28 08:15:11.541',1,0,0);
/*!40000 ALTER TABLE `EXTERNAL_SYSTEM` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `FLOOR`
--

DROP TABLE IF EXISTS `FLOOR`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `FLOOR` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `SITE_ID_FK` int unsigned NOT NULL COMMENT 'FK SITE.ID',
  `NAME` varchar(40) NOT NULL COMMENT 'Floor label (Ground, 1st ...)',
  `LEVEL_NUMBER` smallint NOT NULL COMMENT 'Floor number; negative for basements',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_FLOOR__SITE_ID_NAME` (`CUSTOMER_ID`,`SITE_ID_FK`,`NAME`),
  UNIQUE KEY `UK_FLOOR__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_FLOOR__SITE_ID_ID` (`CUSTOMER_ID`,`SITE_ID_FK`,`ID`),
  CONSTRAINT `FK_FLOOR__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_FLOOR__SITE_ID` FOREIGN KEY (`CUSTOMER_ID`, `SITE_ID_FK`) REFERENCES `SITE` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Floor inside a site (facility tab). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `FLOOR`
--

LOCK TABLES `FLOOR` WRITE;
/*!40000 ALTER TABLE `FLOOR` DISABLE KEYS */;
INSERT INTO `FLOOR` VALUES (1,1,2,'Ground floor',0,'2026-09-28 08:15:11.538',1,'2026-09-28 08:15:11.538',1,0),(2,1,3,'Level 1',1,'2026-09-28 08:15:11.538',1,'2026-09-28 08:15:11.538',1,0);
/*!40000 ALTER TABLE `FLOOR` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `FREQUENCY_BAND`
--

DROP TABLE IF EXISTS `FREQUENCY_BAND`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `FREQUENCY_BAND` (
  `ID` smallint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK (catalog)',
  `TECHNOLOGY_CODE` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'FK TECHNOLOGY.CODE (GSM, UMTS, LTE, NR, NB_IOT)',
  `CODE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Band code as named by 3GPP / the operator (GSM900, B1, B3, B40, n78, n258)',
  `DUPLEX_MODE` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Duplexing. Values: FDD, TDD, SDL, SUL',
  `DOWNLINK_LOW_MHZ` decimal(9,3) NOT NULL COMMENT 'Downlink (or TDD) range start, MHz',
  `DOWNLINK_HIGH_MHZ` decimal(9,3) NOT NULL COMMENT 'Downlink (or TDD) range end, MHz',
  `UPLINK_LOW_MHZ` decimal(9,3) DEFAULT NULL COMMENT 'Uplink range start, MHz (FDD / SUL); NULL for TDD / SDL',
  `UPLINK_HIGH_MHZ` decimal(9,3) DEFAULT NULL COMMENT 'Uplink range end, MHz',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_FREQUENCY_BAND__TECHNOLOGY_CODE_CODE` (`TECHNOLOGY_CODE`,`CODE`),
  CONSTRAINT `FK_FREQUENCY_BAND__TECHNOLOGY_CODE` FOREIGN KEY (`TECHNOLOGY_CODE`) REFERENCES `TECHNOLOGY` (`CODE`),
  CONSTRAINT `CK_FREQUENCY_BAND__DUPLEX_MODE_VALUES` CHECK ((`DUPLEX_MODE` in (_utf8mb4'FDD',_utf8mb4'TDD',_utf8mb4'SDL',_utf8mb4'SUL'))),
  CONSTRAINT `CK_FREQUENCY_BAND__RANGES` CHECK (((`DOWNLINK_LOW_MHZ` < `DOWNLINK_HIGH_MHZ`) and ((`UPLINK_LOW_MHZ` is null) = (`UPLINK_HIGH_MHZ` is null)) and ((`UPLINK_LOW_MHZ` is null) or (`UPLINK_LOW_MHZ` < `UPLINK_HIGH_MHZ`)) and ((`DUPLEX_MODE` in (_utf8mb4'FDD',_utf8mb4'SUL')) = (`UPLINK_LOW_MHZ` is not null))))
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Radio band per technology with duplex mode and frequency ranges. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `FREQUENCY_BAND`
--

LOCK TABLES `FREQUENCY_BAND` WRITE;
/*!40000 ALTER TABLE `FREQUENCY_BAND` DISABLE KEYS */;
INSERT INTO `FREQUENCY_BAND` VALUES (1,'GSM','GSM900','FDD',935.000,960.000,890.000,915.000),(2,'GSM','GSM1800','FDD',1805.000,1880.000,1710.000,1785.000),(3,'UMTS','B1','FDD',2110.000,2170.000,1920.000,1980.000),(4,'UMTS','B8','FDD',925.000,960.000,880.000,915.000),(5,'LTE','B1','FDD',2110.000,2170.000,1920.000,1980.000),(6,'LTE','B3','FDD',1805.000,1880.000,1710.000,1785.000),(7,'LTE','B5','FDD',869.000,894.000,824.000,849.000),(8,'LTE','B8','FDD',925.000,960.000,880.000,915.000),(9,'LTE','B28','FDD',758.000,803.000,703.000,748.000),(10,'LTE','B40','TDD',2300.000,2400.000,NULL,NULL),(11,'LTE','B41','TDD',2496.000,2690.000,NULL,NULL),(12,'NB_IOT','B8','FDD',925.000,960.000,880.000,915.000),(13,'NB_IOT','B20','FDD',791.000,821.000,832.000,862.000),(14,'NR','n1','FDD',2110.000,2170.000,1920.000,1980.000),(15,'NR','n3','FDD',1805.000,1880.000,1710.000,1785.000),(16,'NR','n28','FDD',758.000,803.000,703.000,748.000),(17,'NR','n77','TDD',3300.000,4200.000,NULL,NULL),(18,'NR','n78','TDD',3300.000,3800.000,NULL,NULL),(19,'NR','n258','TDD',24250.000,27500.000,NULL,NULL);
/*!40000 ALTER TABLE `FREQUENCY_BAND` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `GEOGRAPHY_LEVEL1`
--

DROP TABLE IF EXISTS `GEOGRAPHY_LEVEL1`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `GEOGRAPHY_LEVEL1` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `GEOGRAPHY_CODE` varchar(64) NOT NULL COMMENT 'Area code',
  `GEOGRAPHY_NAME` varchar(200) NOT NULL COMMENT 'Area name',
  `PRETTY_NAME` varchar(150) DEFAULT NULL COMMENT 'Display name',
  `LATITUDE` decimal(9,6) DEFAULT NULL COMMENT 'Centroid latitude (WGS84)',
  `LONGITUDE` decimal(9,6) DEFAULT NULL COMMENT 'Centroid longitude (WGS84)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_GEOGRAPHY_LEVEL1__GEOGRAPHY_CODE` (`CUSTOMER_ID`,`GEOGRAPHY_CODE`),
  UNIQUE KEY `UK_GEOGRAPHY_LEVEL1__GEOGRAPHY_NAME` (`CUSTOMER_ID`,`GEOGRAPHY_NAME`),
  UNIQUE KEY `UK_GEOGRAPHY_LEVEL1__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  CONSTRAINT `FK_GEOGRAPHY_LEVEL1__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `CK_GEOGRAPHY_LEVEL1__LAT_LONG` CHECK ((((`LATITUDE` is null) = (`LONGITUDE` is null)) and ((`LATITUDE` is null) or ((`LATITUDE` between -(90) and 90) and (`LONGITUDE` between -(180) and 180)))))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Level-1 geography (country / state). Names are unique per parent, not globally (the old schema could not hold two districts with the same name). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `GEOGRAPHY_LEVEL1`
--

LOCK TABLES `GEOGRAPHY_LEVEL1` WRITE;
/*!40000 ALTER TABLE `GEOGRAPHY_LEVEL1` DISABLE KEYS */;
INSERT INTO `GEOGRAPHY_LEVEL1` VALUES (1,1,'IN-KA','Karnataka','Karnataka',15.317300,75.713900,'2026-09-28 08:15:11.531',1,'2026-09-28 08:15:11.531',1,0);
/*!40000 ALTER TABLE `GEOGRAPHY_LEVEL1` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `GEOGRAPHY_LEVEL2`
--

DROP TABLE IF EXISTS `GEOGRAPHY_LEVEL2`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `GEOGRAPHY_LEVEL2` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `GEOGRAPHY_LEVEL1_ID_FK` int unsigned NOT NULL COMMENT 'FK GEOGRAPHY_LEVEL1.ID: the parent area',
  `GEOGRAPHY_CODE` varchar(64) NOT NULL COMMENT 'Area code',
  `GEOGRAPHY_NAME` varchar(200) NOT NULL COMMENT 'Area name',
  `PRETTY_NAME` varchar(150) DEFAULT NULL COMMENT 'Display name',
  `LATITUDE` decimal(9,6) DEFAULT NULL COMMENT 'Centroid latitude (WGS84)',
  `LONGITUDE` decimal(9,6) DEFAULT NULL COMMENT 'Centroid longitude (WGS84)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_GEOGRAPHY_LEVEL2__GEOGRAPHY_CODE` (`CUSTOMER_ID`,`GEOGRAPHY_CODE`),
  UNIQUE KEY `UK_GEOGRAPHY_LEVEL2__GEOGRAPHY_LEVEL1_ID_GEOGRAPHY_NAME` (`CUSTOMER_ID`,`GEOGRAPHY_LEVEL1_ID_FK`,`GEOGRAPHY_NAME`),
  UNIQUE KEY `UK_GEOGRAPHY_LEVEL2__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  CONSTRAINT `FK_GEOGRAPHY_LEVEL2__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_GEOGRAPHY_LEVEL2__GEOGRAPHY_LEVEL1_ID` FOREIGN KEY (`CUSTOMER_ID`, `GEOGRAPHY_LEVEL1_ID_FK`) REFERENCES `GEOGRAPHY_LEVEL1` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_GEOGRAPHY_LEVEL2__LAT_LONG` CHECK ((((`LATITUDE` is null) = (`LONGITUDE` is null)) and ((`LATITUDE` is null) or ((`LATITUDE` between -(90) and 90) and (`LONGITUDE` between -(180) and 180)))))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Level-2 geography (district / city). Names are unique per parent, not globally (the old schema could not hold two districts with the same name). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `GEOGRAPHY_LEVEL2`
--

LOCK TABLES `GEOGRAPHY_LEVEL2` WRITE;
/*!40000 ALTER TABLE `GEOGRAPHY_LEVEL2` DISABLE KEYS */;
INSERT INTO `GEOGRAPHY_LEVEL2` VALUES (1,1,1,'IN-KA-BLR','Bengaluru Urban','Bengaluru',12.971600,77.594600,'2026-09-28 08:15:11.531',1,'2026-09-28 08:15:11.531',1,0);
/*!40000 ALTER TABLE `GEOGRAPHY_LEVEL2` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `GEOGRAPHY_LEVEL3`
--

DROP TABLE IF EXISTS `GEOGRAPHY_LEVEL3`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `GEOGRAPHY_LEVEL3` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `GEOGRAPHY_LEVEL2_ID_FK` int unsigned NOT NULL COMMENT 'FK GEOGRAPHY_LEVEL2.ID: the parent area',
  `GEOGRAPHY_CODE` varchar(64) NOT NULL COMMENT 'Area code',
  `GEOGRAPHY_NAME` varchar(200) NOT NULL COMMENT 'Area name',
  `PRETTY_NAME` varchar(150) DEFAULT NULL COMMENT 'Display name',
  `LATITUDE` decimal(9,6) DEFAULT NULL COMMENT 'Centroid latitude (WGS84)',
  `LONGITUDE` decimal(9,6) DEFAULT NULL COMMENT 'Centroid longitude (WGS84)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_GEOGRAPHY_LEVEL3__GEOGRAPHY_CODE` (`CUSTOMER_ID`,`GEOGRAPHY_CODE`),
  UNIQUE KEY `UK_GEOGRAPHY_LEVEL3__GEOGRAPHY_LEVEL2_ID_GEOGRAPHY_NAME` (`CUSTOMER_ID`,`GEOGRAPHY_LEVEL2_ID_FK`,`GEOGRAPHY_NAME`),
  UNIQUE KEY `UK_GEOGRAPHY_LEVEL3__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  CONSTRAINT `FK_GEOGRAPHY_LEVEL3__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_GEOGRAPHY_LEVEL3__GEOGRAPHY_LEVEL2_ID` FOREIGN KEY (`CUSTOMER_ID`, `GEOGRAPHY_LEVEL2_ID_FK`) REFERENCES `GEOGRAPHY_LEVEL2` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_GEOGRAPHY_LEVEL3__LAT_LONG` CHECK ((((`LATITUDE` is null) = (`LONGITUDE` is null)) and ((`LATITUDE` is null) or ((`LATITUDE` between -(90) and 90) and (`LONGITUDE` between -(180) and 180)))))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Level-3 geography (locality). Names are unique per parent, not globally (the old schema could not hold two districts with the same name). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `GEOGRAPHY_LEVEL3`
--

LOCK TABLES `GEOGRAPHY_LEVEL3` WRITE;
/*!40000 ALTER TABLE `GEOGRAPHY_LEVEL3` DISABLE KEYS */;
INSERT INTO `GEOGRAPHY_LEVEL3` VALUES (1,1,1,'IN-KA-BLR-KOR','Koramangala',NULL,NULL,NULL,'2026-09-28 08:15:11.532',1,'2026-09-28 08:15:11.532',1,0),(2,1,1,'IN-KA-BLR-WHF','Whitefield',NULL,NULL,NULL,'2026-09-28 08:15:11.532',1,'2026-09-28 08:15:11.532',1,0);
/*!40000 ALTER TABLE `GEOGRAPHY_LEVEL3` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `GEOGRAPHY_LEVEL4`
--

DROP TABLE IF EXISTS `GEOGRAPHY_LEVEL4`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `GEOGRAPHY_LEVEL4` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `GEOGRAPHY_LEVEL3_ID_FK` int unsigned NOT NULL COMMENT 'FK GEOGRAPHY_LEVEL3.ID: the parent area',
  `GEOGRAPHY_CODE` varchar(64) NOT NULL COMMENT 'Area code',
  `GEOGRAPHY_NAME` varchar(200) NOT NULL COMMENT 'Area name',
  `PRETTY_NAME` varchar(150) DEFAULT NULL COMMENT 'Display name',
  `LATITUDE` decimal(9,6) DEFAULT NULL COMMENT 'Centroid latitude (WGS84)',
  `LONGITUDE` decimal(9,6) DEFAULT NULL COMMENT 'Centroid longitude (WGS84)',
  `MORPHOLOGY` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Morphology type. Values: DENSE_URBAN, URBAN, SUBURBAN, RURAL',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_GEOGRAPHY_LEVEL4__GEOGRAPHY_CODE` (`CUSTOMER_ID`,`GEOGRAPHY_CODE`),
  UNIQUE KEY `UK_GEOGRAPHY_LEVEL4__GEOGRAPHY_LEVEL3_ID_GEOGRAPHY_NAME` (`CUSTOMER_ID`,`GEOGRAPHY_LEVEL3_ID_FK`,`GEOGRAPHY_NAME`),
  UNIQUE KEY `UK_GEOGRAPHY_LEVEL4__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  CONSTRAINT `FK_GEOGRAPHY_LEVEL4__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_GEOGRAPHY_LEVEL4__GEOGRAPHY_LEVEL3_ID` FOREIGN KEY (`CUSTOMER_ID`, `GEOGRAPHY_LEVEL3_ID_FK`) REFERENCES `GEOGRAPHY_LEVEL3` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_GEOGRAPHY_LEVEL4__LAT_LONG` CHECK ((((`LATITUDE` is null) = (`LONGITUDE` is null)) and ((`LATITUDE` is null) or ((`LATITUDE` between -(90) and 90) and (`LONGITUDE` between -(180) and 180))))),
  CONSTRAINT `CK_GEOGRAPHY_LEVEL4__MORPHOLOGY_VALUES` CHECK ((`MORPHOLOGY` in (_utf8mb4'DENSE_URBAN',_utf8mb4'URBAN',_utf8mb4'SUBURBAN',_utf8mb4'RURAL')))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Level-4 geography (cluster / pin area). Names are unique per parent, not globally (the old schema could not hold two districts with the same name). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `GEOGRAPHY_LEVEL4`
--

LOCK TABLES `GEOGRAPHY_LEVEL4` WRITE;
/*!40000 ALTER TABLE `GEOGRAPHY_LEVEL4` DISABLE KEYS */;
INSERT INTO `GEOGRAPHY_LEVEL4` VALUES (1,1,1,'IN-KA-BLR-KOR-4','Koramangala 4th Block',NULL,NULL,NULL,'DENSE_URBAN','2026-09-28 08:15:11.532',1,'2026-09-28 08:15:11.532',1,0),(2,1,2,'IN-KA-BLR-WHF-EPIP','Whitefield EPIP zone',NULL,NULL,NULL,'URBAN','2026-09-28 08:15:11.532',1,'2026-09-28 08:15:11.532',1,0);
/*!40000 ALTER TABLE `GEOGRAPHY_LEVEL4` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `IP_SUBNET`
--

DROP TABLE IF EXISTS `IP_SUBNET`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `IP_SUBNET` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID: this row''s supertype row (identity for relationships, external refs, attributes, reconciliation)',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'IP_SUBNET' COMMENT 'Constant IP_SUBNET: FK-bound to RESOURCE so the supertype row is of this type',
  `NETWORK_ADDRESS` varchar(45) NOT NULL COMMENT 'Network address, IPv4 or IPv6 text form (10.20.0.0)',
  `PREFIX_LENGTH` tinyint unsigned NOT NULL COMMENT 'Prefix length (0-32 IPv4, 0-128 IPv6)',
  `NETWORK_ADDRESS_BINARY` varbinary(16) GENERATED ALWAYS AS (inet6_aton(`NETWORK_ADDRESS`)) STORED NOT NULL COMMENT 'Derived canonical binary address',
  `ADDRESS_FAMILY` varchar(4) GENERATED ALWAYS AS (if(is_ipv4(`NETWORK_ADDRESS`),_utf8mb4'IPV4',_utf8mb4'IPV6')) STORED NOT NULL COMMENT 'Derived: IPV4 or IPV6',
  `SERVICE_INSTANCE_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK SERVICE_INSTANCE.ID: L3VPN routing context; NULL = global routing table',
  `ROUTING_CONTEXT_KEY` int unsigned GENERATED ALWAYS AS (ifnull(`SERVICE_INSTANCE_ID_FK`,0)) STORED NOT NULL COMMENT 'Derived: 0 for global, else the L3VPN id (keeps prefixes unique per context)',
  `PARENT_SUBNET_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK IP_SUBNET.ID: enclosing prefix in the plan; cycles rejected by the application',
  `SITE_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK SITE.ID when the prefix is site-scoped',
  `PURPOSE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'INFRASTRUCTURE' COMMENT 'Use of the prefix. Values: INFRASTRUCTURE, P2P, LOOPBACK, MANAGEMENT, CUSTOMER, RAN_TRANSPORT, CORE_SIGNALLING, USER_PLANE, POOL',
  `STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'ALLOCATED' COMMENT 'Plan state. Values: PLANNED, ALLOCATED, RESERVED, DEPRECATED',
  `DESCRIPTION` varchar(255) DEFAULT NULL COMMENT 'Description',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_IP_SUBNET__CONTEXT_PREFIX` (`CUSTOMER_ID`,`ROUTING_CONTEXT_KEY`,`NETWORK_ADDRESS_BINARY`,`PREFIX_LENGTH`),
  UNIQUE KEY `UK_IP_SUBNET__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_IP_SUBNET__RESOURCE_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`RESOURCE_TYPE`),
  KEY `IDX_IP_SUBNET__SERVICE_INSTANCE_ID` (`CUSTOMER_ID`,`SERVICE_INSTANCE_ID_FK`),
  KEY `IDX_IP_SUBNET__PARENT_SUBNET_ID` (`CUSTOMER_ID`,`PARENT_SUBNET_ID_FK`),
  KEY `IDX_IP_SUBNET__SITE_ID` (`CUSTOMER_ID`,`SITE_ID_FK`),
  CONSTRAINT `FK_IP_SUBNET__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_IP_SUBNET__PARENT_SUBNET_ID` FOREIGN KEY (`CUSTOMER_ID`, `PARENT_SUBNET_ID_FK`) REFERENCES `IP_SUBNET` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_IP_SUBNET__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `FK_IP_SUBNET__SERVICE_INSTANCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `SERVICE_INSTANCE_ID_FK`) REFERENCES `SERVICE_INSTANCE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_IP_SUBNET__SITE_ID` FOREIGN KEY (`CUSTOMER_ID`, `SITE_ID_FK`) REFERENCES `SITE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_IP_SUBNET__ADDRESS` CHECK ((is_ipv4(`NETWORK_ADDRESS`) or is_ipv6(`NETWORK_ADDRESS`))),
  CONSTRAINT `CK_IP_SUBNET__NO_HOST_BITS_V4` CHECK (((not(is_ipv4(`NETWORK_ADDRESS`))) or (`PREFIX_LENGTH` > 32) or ((inet_aton(`NETWORK_ADDRESS`) & ((1 << (32 - `PREFIX_LENGTH`)) - 1)) = 0))),
  CONSTRAINT `CK_IP_SUBNET__PREFIX` CHECK (((`PREFIX_LENGTH` <= 128) and ((not(is_ipv4(`NETWORK_ADDRESS`))) or (`PREFIX_LENGTH` <= 32)))),
  CONSTRAINT `CK_IP_SUBNET__PURPOSE_VALUES` CHECK ((`PURPOSE` in (_utf8mb4'INFRASTRUCTURE',_utf8mb4'P2P',_utf8mb4'LOOPBACK',_utf8mb4'MANAGEMENT',_utf8mb4'CUSTOMER',_utf8mb4'RAN_TRANSPORT',_utf8mb4'CORE_SIGNALLING',_utf8mb4'USER_PLANE',_utf8mb4'POOL'))),
  CONSTRAINT `CK_IP_SUBNET__RESOURCE_TYPE` CHECK ((`RESOURCE_TYPE` = _utf8mb4'IP_SUBNET')),
  CONSTRAINT `CK_IP_SUBNET__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'PLANNED',_utf8mb4'ALLOCATED',_utf8mb4'RESERVED',_utf8mb4'DEPRECATED')))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='IP prefix per routing context (global or L3VPN), with hierarchy and purpose. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `IP_SUBNET`
--

LOCK TABLES `IP_SUBNET` WRITE;
/*!40000 ALTER TABLE `IP_SUBNET` DISABLE KEYS */;
INSERT INTO `IP_SUBNET` (`ID`, `CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`, `NETWORK_ADDRESS`, `PREFIX_LENGTH`, `SERVICE_INSTANCE_ID_FK`, `PARENT_SUBNET_ID_FK`, `SITE_ID_FK`, `PURPOSE`, `STATUS`, `DESCRIPTION`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`) VALUES (1,1,30,'IP_SUBNET','10.20.7.0',24,NULL,NULL,2,'MANAGEMENT','ALLOCATED','Whitefield CO management','2026-09-28 08:15:11.558',2,'2026-09-28 08:15:11.558',2,0),(2,1,31,'IP_SUBNET','10.255.0.0',24,NULL,NULL,NULL,'LOOPBACK','ALLOCATED','Router loopbacks','2026-09-28 08:15:11.558',2,'2026-09-28 08:15:11.558',2,0),(3,1,32,'IP_SUBNET','192.168.10.0',24,1,NULL,NULL,'CUSTOMER','ALLOCATED','ACME PE-CE link','2026-09-28 08:15:11.571',2,'2026-09-28 08:15:11.571',2,0);
/*!40000 ALTER TABLE `IP_SUBNET` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `LINK`
--

DROP TABLE IF EXISTS `LINK`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LINK` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID: this row''s supertype row (identity for relationships, external refs, attributes, reconciliation)',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'LINK' COMMENT 'Constant LINK: FK-bound to RESOURCE so the supertype row is of this type',
  `LAYER` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'LINK_LAYER.CODE: layer / protocol / interface of the link',
  `IS_DIRECTED` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Copy of LINK_LAYER.IS_DIRECTED, FK-bound; decides how LINK_KEY orders the ends',
  `LINK_NAME` varchar(200) DEFAULT NULL COMMENT 'Link name / hop code',
  `CIRCUIT_ID` varchar(64) DEFAULT NULL COMMENT 'Business circuit id; the carrying fiber circuit itself is an EXTERNAL_RESOURCE',
  `A_NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID: A-end device',
  `A_PORT_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK PORT.ID: A-end interface; must be a port of A_NETWORK_ELEMENT_ID_FK',
  `A_IP_ADDRESS` varchar(45) DEFAULT NULL COMMENT 'A-end address used by the protocol',
  `Z_NETWORK_ELEMENT_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK NETWORK_ELEMENT.ID: Z-end device; NULL when the neighbour is not in inventory',
  `Z_PORT_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK PORT.ID: Z-end interface; must be a port of Z_NETWORK_ELEMENT_ID_FK',
  `Z_IP_ADDRESS` varchar(45) DEFAULT NULL COMMENT 'Z-end address used by the protocol',
  `Z_REMOTE_NAME` varchar(253) DEFAULT NULL COMMENT 'Neighbour name as reported, when the Z device is not in inventory',
  `LINK_KEY` varchar(400) GENERATED ALWAYS AS (concat(`LAYER`,_utf8mb4'|',if((`IS_DIRECTED` = 1),concat(concat(`A_NETWORK_ELEMENT_ID_FK`,_utf8mb4':',ifnull(`A_PORT_ID_FK`,_utf8mb4''),_utf8mb4':'),_utf8mb4'>',if((`Z_NETWORK_ELEMENT_ID_FK` is null),concat(_utf8mb4'?',ifnull(`Z_REMOTE_NAME`,`Z_IP_ADDRESS`)),concat(`Z_NETWORK_ELEMENT_ID_FK`,_utf8mb4':',ifnull(`Z_PORT_ID_FK`,_utf8mb4''),_utf8mb4':'))),concat(least(concat(`A_NETWORK_ELEMENT_ID_FK`,_utf8mb4':',ifnull(`A_PORT_ID_FK`,_utf8mb4''),_utf8mb4':'),if((`Z_NETWORK_ELEMENT_ID_FK` is null),concat(_utf8mb4'?',ifnull(`Z_REMOTE_NAME`,`Z_IP_ADDRESS`)),concat(`Z_NETWORK_ELEMENT_ID_FK`,_utf8mb4':',ifnull(`Z_PORT_ID_FK`,_utf8mb4''),_utf8mb4':'))),_utf8mb4'~',greatest(concat(`A_NETWORK_ELEMENT_ID_FK`,_utf8mb4':',ifnull(`A_PORT_ID_FK`,_utf8mb4''),_utf8mb4':'),if((`Z_NETWORK_ELEMENT_ID_FK` is null),concat(_utf8mb4'?',ifnull(`Z_REMOTE_NAME`,`Z_IP_ADDRESS`)),concat(`Z_NETWORK_ELEMENT_ID_FK`,_utf8mb4':',ifnull(`Z_PORT_ID_FK`,_utf8mb4''),_utf8mb4':'))))))) STORED NOT NULL COMMENT 'Derived natural key: layer + ends (ordered for directed layers, unordered otherwise)',
  `STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'UNKNOWN' COMMENT 'Link state (BGP uses established / idle / active / connect). Values: UP, DOWN, ESTABLISHED, IDLE, ACTIVE, CONNECT, UNKNOWN',
  `DOWN_REASON` varchar(255) DEFAULT NULL COMMENT 'Reason when down',
  `CAPACITY_MBPS` int unsigned DEFAULT NULL COMMENT 'Provisioned capacity, Mbps',
  `RECORD_SOURCE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'DISCOVERED' COMMENT 'How the record entered inventory. Values: DISCOVERED, PLANNED_CIQ, MANUAL, EMS, EXTERNAL_SYNC',
  `FIRST_SEEN_TIME` datetime(3) DEFAULT NULL COMMENT 'First discovery (UTC)',
  `LAST_SEEN_TIME` datetime(3) DEFAULT NULL COMMENT 'Last discovery that confirmed it (UTC)',
  `RECORD_STATE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'ACTIVE' COMMENT 'INACTIVE = no longer seen (Inactive inventory > LLDP / OSPF / BGP). Values: ACTIVE, INACTIVE',
  `INACTIVE_TIME` datetime(3) DEFAULT NULL COMMENT 'When it went inactive (UTC)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  `ACTIVE_FLAG` tinyint(1) GENERATED ALWAYS AS (if((`RECORD_STATE` = _utf8mb4'ACTIVE'),1,NULL)) STORED COMMENT '1 while ACTIVE, NULL once INACTIVE: UNIQUE keys ending in ACTIVE_FLAG ignore retired rows',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_LINK__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_LINK__CUSTOMER_ID_ID_LAYER` (`CUSTOMER_ID`,`ID`,`LAYER`),
  UNIQUE KEY `UK_LINK__RESOURCE_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`RESOURCE_TYPE`),
  UNIQUE KEY `UK_LINK__LINK_KEY` (`CUSTOMER_ID`,`LINK_KEY`,`ACTIVE_FLAG`),
  KEY `IDX_LINK__A_NETWORK_ELEMENT_ID_FK` (`CUSTOMER_ID`,`A_NETWORK_ELEMENT_ID_FK`),
  KEY `IDX_LINK__A_NETWORK_ELEMENT_ID_A_PORT_ID` (`CUSTOMER_ID`,`A_NETWORK_ELEMENT_ID_FK`,`A_PORT_ID_FK`),
  KEY `IDX_LINK__Z_NETWORK_ELEMENT_ID_FK` (`CUSTOMER_ID`,`Z_NETWORK_ELEMENT_ID_FK`),
  KEY `IDX_LINK__Z_NETWORK_ELEMENT_ID_Z_PORT_ID` (`CUSTOMER_ID`,`Z_NETWORK_ELEMENT_ID_FK`,`Z_PORT_ID_FK`),
  KEY `IDX_LINK__LAYER_IS_DIRECTED` (`LAYER`,`IS_DIRECTED`),
  KEY `IDX_LINK__LAYER_RECORD_STATE` (`CUSTOMER_ID`,`LAYER`,`RECORD_STATE`),
  KEY `IDX_LINK__CIRCUIT_ID` (`CUSTOMER_ID`,`CIRCUIT_ID`),
  CONSTRAINT `FK_LINK__A_NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `A_NETWORK_ELEMENT_ID_FK`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_LINK__A_NETWORK_ELEMENT_ID_A_PORT_ID` FOREIGN KEY (`CUSTOMER_ID`, `A_NETWORK_ELEMENT_ID_FK`, `A_PORT_ID_FK`) REFERENCES `PORT` (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `ID`),
  CONSTRAINT `FK_LINK__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_LINK__LAYER` FOREIGN KEY (`LAYER`, `IS_DIRECTED`) REFERENCES `LINK_LAYER` (`CODE`, `IS_DIRECTED`),
  CONSTRAINT `FK_LINK__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `FK_LINK__Z_NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `Z_NETWORK_ELEMENT_ID_FK`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_LINK__Z_NETWORK_ELEMENT_ID_Z_PORT_ID` FOREIGN KEY (`CUSTOMER_ID`, `Z_NETWORK_ELEMENT_ID_FK`, `Z_PORT_ID_FK`) REFERENCES `PORT` (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `ID`),
  CONSTRAINT `CK_LINK__BGP_STATES` CHECK (((`STATUS` not in (_utf8mb4'ESTABLISHED',_utf8mb4'IDLE',_utf8mb4'ACTIVE',_utf8mb4'CONNECT')) or (`LAYER` = _utf8mb4'BGP'))),
  CONSTRAINT `CK_LINK__INACTIVE` CHECK (((`RECORD_STATE` = _utf8mb4'INACTIVE') = (`INACTIVE_TIME` is not null))),
  CONSTRAINT `CK_LINK__IPS` CHECK ((((`A_IP_ADDRESS` is null) or is_ipv4(`A_IP_ADDRESS`) or is_ipv6(`A_IP_ADDRESS`)) and ((`Z_IP_ADDRESS` is null) or is_ipv4(`Z_IP_ADDRESS`) or is_ipv6(`Z_IP_ADDRESS`)))),
  CONSTRAINT `CK_LINK__NOT_SELF` CHECK (((`Z_NETWORK_ELEMENT_ID_FK` is null) or (`A_NETWORK_ELEMENT_ID_FK` <> `Z_NETWORK_ELEMENT_ID_FK`) or (`A_PORT_ID_FK` is null) or (`Z_PORT_ID_FK` is null) or (`A_PORT_ID_FK` <> `Z_PORT_ID_FK`))),
  CONSTRAINT `CK_LINK__PORTS_NEED_NE` CHECK (((`Z_PORT_ID_FK` is null) or (`Z_NETWORK_ELEMENT_ID_FK` is not null))),
  CONSTRAINT `CK_LINK__RECORD_SOURCE_VALUES` CHECK ((`RECORD_SOURCE` in (_utf8mb4'DISCOVERED',_utf8mb4'PLANNED_CIQ',_utf8mb4'MANUAL',_utf8mb4'EMS',_utf8mb4'EXTERNAL_SYNC'))),
  CONSTRAINT `CK_LINK__RECORD_STATE_VALUES` CHECK ((`RECORD_STATE` in (_utf8mb4'ACTIVE',_utf8mb4'INACTIVE'))),
  CONSTRAINT `CK_LINK__RESOURCE_TYPE` CHECK ((`RESOURCE_TYPE` = _utf8mb4'LINK')),
  CONSTRAINT `CK_LINK__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'UP',_utf8mb4'DOWN',_utf8mb4'ESTABLISHED',_utf8mb4'IDLE',_utf8mb4'ACTIVE',_utf8mb4'CONNECT',_utf8mb4'UNKNOWN'))),
  CONSTRAINT `CK_LINK__Z_END` CHECK (((`Z_NETWORK_ELEMENT_ID_FK` is not null) or (`Z_REMOTE_NAME` is not null) or (`Z_IP_ADDRESS` is not null)))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Connection between two devices at one catalogued layer, unique by natural key among active rows. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `LINK`
--

LOCK TABLES `LINK` WRITE;
/*!40000 ALTER TABLE `LINK` DISABLE KEYS */;
INSERT INTO `LINK` (`ID`, `CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`, `LAYER`, `IS_DIRECTED`, `LINK_NAME`, `CIRCUIT_ID`, `A_NETWORK_ELEMENT_ID_FK`, `A_PORT_ID_FK`, `A_IP_ADDRESS`, `Z_NETWORK_ELEMENT_ID_FK`, `Z_PORT_ID_FK`, `Z_IP_ADDRESS`, `Z_REMOTE_NAME`, `STATUS`, `DOWN_REASON`, `CAPACITY_MBPS`, `RECORD_SOURCE`, `FIRST_SEEN_TIME`, `LAST_SEEN_TIME`, `RECORD_STATE`, `INACTIVE_TIME`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`) VALUES (1,1,25,'LINK','PHYSICAL',0,'R07 Hu0/0/0/0 - SW01 Eth1/49',NULL,1,1,NULL,2,4,NULL,NULL,'UP',NULL,100000,'MANUAL',NULL,NULL,'ACTIVE',NULL,'2026-09-28 08:15:11.568',2,'2026-09-28 08:15:11.568',2,0),(2,1,26,'LINK','LLDP',0,'R07 <-> SW01 (LLDP)',NULL,1,1,NULL,2,4,NULL,NULL,'UP',NULL,NULL,'DISCOVERED','2025-11-02 12:00:00.000','2026-09-25 01:58:03.000','ACTIVE',NULL,'2026-09-28 08:15:11.568',6,'2026-09-28 08:15:11.568',6,0),(3,1,27,'LINK','NG_C',0,'BLR-277-GNB - vAMF-01 (N2)',NULL,4,NULL,NULL,7,NULL,NULL,NULL,'UP',NULL,NULL,'EMS','2024-05-12 10:00:00.000','2026-09-25 03:00:00.000','ACTIVE',NULL,'2026-09-28 08:15:11.568',6,'2026-09-28 08:15:11.568',6,0);
/*!40000 ALTER TABLE `LINK` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `LINK_LAYER`
--

DROP TABLE IF EXISTS `LINK_LAYER`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LINK_LAYER` (
  `ID` smallint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK (catalog)',
  `CODE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Layer code (PHYSICAL, LLDP, OSPF, ISIS, BGP, RSVP_TE_LSP, MICROWAVE_HOP, S1_U, NG_C, F1_C ...)',
  `NAME` varchar(64) NOT NULL COMMENT 'Display name',
  `CATEGORY` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Layer family. Values: PHYSICAL, L2_ADJACENCY, ROUTING_ADJACENCY, TUNNEL, OPTICAL, MICROWAVE, FRONTHAUL, RAN_INTERFACE, CORE_INTERFACE',
  `IS_DIRECTED` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 when A->Z and Z->A are different links (LSP, SR policy); 0 when the pair is unordered (cable, adjacency, interface)',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_LINK_LAYER__CODE` (`CODE`),
  UNIQUE KEY `UK_LINK_LAYER__CODE_IS_DIRECTED` (`CODE`,`IS_DIRECTED`),
  CONSTRAINT `CK_LINK_LAYER__CATEGORY_VALUES` CHECK ((`CATEGORY` in (_utf8mb4'PHYSICAL',_utf8mb4'L2_ADJACENCY',_utf8mb4'ROUTING_ADJACENCY',_utf8mb4'TUNNEL',_utf8mb4'OPTICAL',_utf8mb4'MICROWAVE',_utf8mb4'FRONTHAUL',_utf8mb4'RAN_INTERFACE',_utf8mb4'CORE_INTERFACE')))
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Kind of LINK across physical, L2, routing, tunnel, optical, microwave, fronthaul and 3GPP interface layers. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `LINK_LAYER`
--

LOCK TABLES `LINK_LAYER` WRITE;
/*!40000 ALTER TABLE `LINK_LAYER` DISABLE KEYS */;
INSERT INTO `LINK_LAYER` VALUES (1,'PHYSICAL','Physical cable / cross-connect','PHYSICAL',0),(2,'LLDP','LLDP neighbour','L2_ADJACENCY',0),(3,'CDP','CDP neighbour','L2_ADJACENCY',0),(4,'LAG','Link aggregation','L2_ADJACENCY',0),(5,'OSPF','OSPF adjacency','ROUTING_ADJACENCY',0),(6,'ISIS','IS-IS adjacency','ROUTING_ADJACENCY',0),(7,'BGP','BGP session','ROUTING_ADJACENCY',0),(8,'LDP','LDP session','ROUTING_ADJACENCY',0),(9,'RSVP_TE_LSP','RSVP-TE LSP','TUNNEL',1),(10,'SR_POLICY','Segment-routing policy','TUNNEL',1),(11,'PSEUDOWIRE','Pseudowire','TUNNEL',0),(12,'VXLAN','VXLAN tunnel','TUNNEL',0),(13,'GRE','GRE tunnel','TUNNEL',0),(14,'OCH','Optical channel (wavelength)','OPTICAL',0),(15,'OTN_ODU','OTN ODU path','OPTICAL',0),(16,'OMS','Optical multiplex section','OPTICAL',0),(17,'MICROWAVE_HOP','Microwave hop','MICROWAVE',0),(18,'CPRI','CPRI fronthaul','FRONTHAUL',0),(19,'ECPRI','eCPRI fronthaul','FRONTHAUL',0),(20,'ABIS','Abis (BTS-BSC)','RAN_INTERFACE',0),(21,'IUB','Iub (NodeB-RNC)','RAN_INTERFACE',0),(22,'IUR','Iur (RNC-RNC)','RAN_INTERFACE',0),(23,'S1_MME','S1-MME (eNB-MME)','RAN_INTERFACE',0),(24,'S1_U','S1-U (eNB-SGW)','RAN_INTERFACE',0),(25,'X2','X2 (eNB-eNB / en-gNB)','RAN_INTERFACE',0),(26,'NG_C','N2 / NG-C (gNB-AMF)','RAN_INTERFACE',0),(27,'NG_U','N3 / NG-U (gNB-UPF)','RAN_INTERFACE',0),(28,'XN','Xn (gNB-gNB)','RAN_INTERFACE',0),(29,'F1_C','F1-C (CU-DU)','RAN_INTERFACE',0),(30,'F1_U','F1-U (CU-DU)','RAN_INTERFACE',0),(31,'E1','E1 (CU-CP / CU-UP)','RAN_INTERFACE',0),(32,'A_IF','A (BSC-MSC)','CORE_INTERFACE',0),(33,'IU_CS','Iu-CS (RNC-MSC)','CORE_INTERFACE',0),(34,'IU_PS','Iu-PS (RNC-SGSN)','CORE_INTERFACE',0),(35,'S5_S8','S5 / S8 (SGW-PGW)','CORE_INTERFACE',0),(36,'S6A','S6a (MME-HSS)','CORE_INTERFACE',0),(37,'S11','S11 (MME-SGW)','CORE_INTERFACE',0),(38,'SGI','SGi (PGW-PDN)','CORE_INTERFACE',0),(39,'GX','Gx (PGW-PCRF)','CORE_INTERFACE',0),(40,'N4','N4 (SMF-UPF)','CORE_INTERFACE',0),(41,'N6','N6 (UPF-DN)','CORE_INTERFACE',0),(42,'N9','N9 (UPF-UPF)','CORE_INTERFACE',0),(43,'SBI','Service-based interface (HTTP/2)','CORE_INTERFACE',0),(44,'SIP','SIP (IMS)','CORE_INTERFACE',0),(45,'DIAMETER','Diameter','CORE_INTERFACE',0);
/*!40000 ALTER TABLE `LINK_LAYER` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `LINK_MICROWAVE_ATTRIBUTE`
--

DROP TABLE IF EXISTS `LINK_MICROWAVE_ATTRIBUTE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LINK_MICROWAVE_ATTRIBUTE` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `LINK_ID_FK` int unsigned NOT NULL COMMENT 'FK LINK.ID',
  `LAYER` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'MICROWAVE_HOP' COMMENT 'Constant MICROWAVE_HOP: FK-binds the row to a microwave link',
  `FREQUENCY_BAND_GHZ` decimal(6,2) DEFAULT NULL COMMENT 'Band, GHz (7, 13, 18, 23, 80)',
  `CHANNEL_BANDWIDTH_MHZ` decimal(7,2) DEFAULT NULL COMMENT 'Channel bandwidth, MHz',
  `POLARIZATION` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Polarisation. Values: H, V, DUAL',
  `MAX_MODULATION` varchar(16) DEFAULT NULL COMMENT 'Highest adaptive modulation (4096QAM)',
  `DISTANCE_KM` decimal(8,3) DEFAULT NULL COMMENT 'Hop length, km',
  `IS_LICENSED` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1 when the frequency is licensed',
  `LICENSE_NUMBER` varchar(64) DEFAULT NULL COMMENT 'WPC / regulator licence number',
  `PROTECTION_SCHEME` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Protection. Values: NONE, 1_PLUS_0, 1_PLUS_1_HSB, 1_PLUS_1_SD, 1_PLUS_1_FD, 2_PLUS_0',
  `FADE_MARGIN_DB` decimal(5,2) DEFAULT NULL COMMENT 'Designed fade margin, dB',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_LINK_MICROWAVE_ATTRIBUTE__LINK_ID` (`CUSTOMER_ID`,`LINK_ID_FK`,`LAYER`),
  CONSTRAINT `FK_LINK_MICROWAVE_ATTRIBUTE__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_LINK_MICROWAVE_ATTRIBUTE__LINK` FOREIGN KEY (`CUSTOMER_ID`, `LINK_ID_FK`, `LAYER`) REFERENCES `LINK` (`CUSTOMER_ID`, `ID`, `LAYER`) ON DELETE CASCADE,
  CONSTRAINT `CK_LINK_MICROWAVE_ATTRIBUTE__FADE_MARGIN_DB_NON_NEGATIVE` CHECK (((`FADE_MARGIN_DB` is null) or (`FADE_MARGIN_DB` >= 0))),
  CONSTRAINT `CK_LINK_MICROWAVE_ATTRIBUTE__LAYER` CHECK ((`LAYER` = _utf8mb4'MICROWAVE_HOP')),
  CONSTRAINT `CK_LINK_MICROWAVE_ATTRIBUTE__LICENSE` CHECK (((`LICENSE_NUMBER` is null) or (`IS_LICENSED` = 1))),
  CONSTRAINT `CK_LINK_MICROWAVE_ATTRIBUTE__MEASURES` CHECK ((((`FREQUENCY_BAND_GHZ` is null) or (`FREQUENCY_BAND_GHZ` > 0)) and ((`CHANNEL_BANDWIDTH_MHZ` is null) or (`CHANNEL_BANDWIDTH_MHZ` > 0)) and ((`DISTANCE_KM` is null) or (`DISTANCE_KM` > 0)))),
  CONSTRAINT `CK_LINK_MICROWAVE_ATTRIBUTE__POLARIZATION_VALUES` CHECK ((`POLARIZATION` in (_utf8mb4'H',_utf8mb4'V',_utf8mb4'DUAL'))),
  CONSTRAINT `CK_LINK_MICROWAVE_ATTRIBUTE__PROTECTION_SCHEME_VALUES` CHECK ((`PROTECTION_SCHEME` in (_utf8mb4'NONE',_utf8mb4'1_PLUS_0',_utf8mb4'1_PLUS_1_HSB',_utf8mb4'1_PLUS_1_SD',_utf8mb4'1_PLUS_1_FD',_utf8mb4'2_PLUS_0')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Hop-level attributes of a microwave link, stored once per hop. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `LINK_MICROWAVE_ATTRIBUTE`
--

LOCK TABLES `LINK_MICROWAVE_ATTRIBUTE` WRITE;
/*!40000 ALTER TABLE `LINK_MICROWAVE_ATTRIBUTE` DISABLE KEYS */;
/*!40000 ALTER TABLE `LINK_MICROWAVE_ATTRIBUTE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `LINK_PROTOCOL_ATTRIBUTE`
--

DROP TABLE IF EXISTS `LINK_PROTOCOL_ATTRIBUTE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LINK_PROTOCOL_ATTRIBUTE` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `LINK_ID_FK` int unsigned NOT NULL COMMENT 'FK LINK.ID',
  `LOCAL_AS_NUMBER` int unsigned DEFAULT NULL COMMENT 'BGP local AS',
  `REMOTE_AS_NUMBER` int unsigned DEFAULT NULL COMMENT 'BGP remote AS',
  `OSPF_AREA` varchar(15) DEFAULT NULL COMMENT 'OSPF area (0.0.0.0)',
  `NEIGHBOR_STATE` varchar(32) DEFAULT NULL COMMENT 'Protocol neighbour state as reported (full(8), established(6))',
  `ISIS_LEVEL` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'IS-IS level. Values: L1, L2, L1L2',
  `INTERFACE_INDEX_A` int unsigned DEFAULT NULL COMMENT 'A-end ifIndex reported by the protocol MIB',
  `INTERFACE_INDEX_Z` int unsigned DEFAULT NULL COMMENT 'Z-end ifIndex reported by the protocol MIB',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_LINK_PROTOCOL_ATTRIBUTE__LINK_ID` (`CUSTOMER_ID`,`LINK_ID_FK`),
  CONSTRAINT `FK_LINK_PROTOCOL_ATTRIBUTE__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_LINK_PROTOCOL_ATTRIBUTE__LINK_ID` FOREIGN KEY (`CUSTOMER_ID`, `LINK_ID_FK`) REFERENCES `LINK` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `CK_LINK_PROTOCOL_ATTRIBUTE__ASN` CHECK ((((`LOCAL_AS_NUMBER` is null) or (`LOCAL_AS_NUMBER` between 1 and 4294967294)) and ((`REMOTE_AS_NUMBER` is null) or (`REMOTE_AS_NUMBER` between 1 and 4294967294)))),
  CONSTRAINT `CK_LINK_PROTOCOL_ATTRIBUTE__ISIS_LEVEL_VALUES` CHECK ((`ISIS_LEVEL` in (_utf8mb4'L1',_utf8mb4'L2',_utf8mb4'L1L2')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Protocol-specific attributes of a routing adjacency (1:1 with LINK): BGP ASNs, OSPF area / neighbour state, IS-IS level. The grids used to overload the interface columns with these. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `LINK_PROTOCOL_ATTRIBUTE`
--

LOCK TABLES `LINK_PROTOCOL_ATTRIBUTE` WRITE;
/*!40000 ALTER TABLE `LINK_PROTOCOL_ATTRIBUTE` DISABLE KEYS */;
INSERT INTO `LINK_PROTOCOL_ATTRIBUTE` VALUES (1,1,2,NULL,NULL,NULL,NULL,NULL,17,49,'2026-09-28 08:15:11.569',6,'2026-09-28 08:15:11.569',6,0);
/*!40000 ALTER TABLE `LINK_PROTOCOL_ATTRIBUTE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_ELEMENT`
--

DROP TABLE IF EXISTS `NETWORK_ELEMENT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_ELEMENT` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID: this row''s supertype row (identity for relationships, external refs, attributes, reconciliation)',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin GENERATED ALWAYS AS (if((`IS_VIRTUAL` = 1),_utf8mb4'VIRTUAL_NE',_utf8mb4'PHYSICAL_NE')) STORED NOT NULL COMMENT 'Derived resource type (RESOURCE_TYPE.CODE); FK-bound to RESOURCE so the supertype row agrees',
  `IS_VIRTUAL` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 for a VNF / CNF instance (details in NETWORK_ELEMENT_VIRTUAL_INSTANCE); fixed at creation',
  `NETWORK_ELEMENT_NAME` varchar(253) NOT NULL COMMENT 'Device name / sysName (unique per tenant among live records; 253 = DNS name limit, same as SCAN_TARGET.HOST_NAME)',
  `NETWORK_ELEMENT_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'device type (NETWORK_ELEMENT_TYPE.CODE); FK-checked with DOMAIN_ID_FK against NETWORK_ELEMENT_TYPE_DOMAIN and with the product model',
  `DOMAIN_ID_FK` smallint unsigned NOT NULL COMMENT 'FK DOMAIN.ID: network domain (RAN, Core, Transport, IP/MPLS, Optical, Microwave ...)',
  `VENDOR_ID_FK` smallint unsigned DEFAULT NULL COMMENT 'FK VENDOR.ID: known from sysObjectID before the model is identified',
  `PRODUCT_MODEL_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK PRODUCT_MODEL.ID; FK-bound to VENDOR_ID_FK and NETWORK_ELEMENT_TYPE so vendor, model and type agree',
  `SERIAL_NUMBER` varchar(64) DEFAULT NULL COMMENT 'Chassis serial. Not unique on purpose: duplicate serials are real and are raised as DUPLICATE discrepancies',
  `MANAGEMENT_IP` varchar(45) DEFAULT NULL COMMENT 'Management address (IPv4 or IPv6 text form, as entered)',
  `MANAGEMENT_IP_BINARY` varbinary(16) GENERATED ALWAYS AS (inet6_aton(`MANAGEMENT_IP`)) STORED COMMENT 'Derived: canonical binary address, for lookups and identity matching',
  `MAC_ADDRESS` char(17) DEFAULT NULL COMMENT 'Chassis / base MAC, aa:bb:cc:dd:ee:ff',
  `OS_VERSION` varchar(64) DEFAULT NULL COMMENT 'Running OS / software version; compared with PRODUCT_MODEL_POLICY for compliance',
  `SOFTWARE_BUILD_NUMBER` varchar(50) DEFAULT NULL COMMENT 'Software build number',
  `CONFIG_TEMPLATE` varchar(64) DEFAULT NULL COMMENT 'Zero-touch template applied (e.g. 24A-NE-ZTP - 1.0)',
  `SITE_ID_FK` int unsigned NOT NULL COMMENT 'FK SITE.ID: where the device is (a warehouse site while in store; the hosting site when virtual)',
  `RACK_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK RACK.ID when rack-mounted; FK-bound to SITE_ID_FK',
  `RACK_UNIT_START` tinyint unsigned DEFAULT NULL COMMENT 'Lowest rack unit occupied',
  `RACK_UNIT_END` tinyint unsigned DEFAULT NULL COMMENT 'Highest rack unit occupied',
  `PARENT_NETWORK_ELEMENT_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK NETWORK_ELEMENT.ID: containing device (shelf in a node, RU under a BBU, DU under a CU); cycles rejected by the application',
  `STOCK_STATE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'PLANNED' COMMENT 'Asset lifecycle; moves limited to NETWORK_ELEMENT_STOCK_TRANSITION by the application. Values: PLANNED, IN_STORE, IN_TRANSIT, DEPLOYED, FAULTY_RMA, DECOMMISSIONED',
  `OPERATIONAL_STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'UNKNOWN' COMMENT 'Operational status. Values: READY, PLANNED, UP, DOWN, DEGRADED, UNKNOWN',
  `ADMIN_STATE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Administrative state. Values: UNLOCKED, LOCKED, SHUTTING_DOWN',
  `RECORD_SOURCE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'How the record entered inventory. Values: DISCOVERED, PLANNED_CIQ, MANUAL, EMS, EXTERNAL_SYNC',
  `RECONCILIATION_STATE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NOT_DISCOVERED' COMMENT 'Latest reconciliation verdict (cache written by the reconciliation job; mapped in RECONCILIATION_STATE_MAP). Values: VERIFIED, DRIFTED, STALE, MISSING, DUPLICATE, NOT_DISCOVERED',
  `LAST_VERIFIED_TIME` datetime(3) DEFAULT NULL COMMENT 'Last time discovery confirmed the record; NULL = never verified',
  `LAST_SEEN_TIME` datetime(3) DEFAULT NULL COMMENT 'Last time any collector saw the device answer (zombie check after decommission)',
  `DECOMMISSIONED_TIME` datetime(3) DEFAULT NULL COMMENT 'When the device was decommissioned (UTC)',
  `DECOMMISSION_REASON` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Why it was decommissioned. Values: CHANGE_REQUEST_REPLACEMENT, END_OF_LIFE, END_OF_SUPPORT, FAULTY_RETURNED, SITE_CONSOLIDATION, CAPACITY_MIGRATION, HARDWARE_REFRESH, WRITTEN_OFF, LEASE_EXPIRED, RING_REDESIGN, TECHNOLOGY_UPGRADE, OTHER',
  `DECOMMISSIONED_BY_FK` bigint unsigned DEFAULT NULL COMMENT 'FK USER.ID: who authorised the decommission',
  `WORK_ORDER_REFERENCE` varchar(40) DEFAULT NULL COMMENT 'Work order behind the last stock change (WO-2291)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  `IS_DELETED` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Soft-delete flag (0 = active, 1 = deleted)',
  `LIVE_FLAG` tinyint(1) GENERATED ALWAYS AS (if((`IS_DELETED` = 0),1,NULL)) STORED COMMENT '1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_ELEMENT__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_NETWORK_ELEMENT__CUSTOMER_ID_ID_NETWORK_ELEMENT_TYPE` (`CUSTOMER_ID`,`ID`,`NETWORK_ELEMENT_TYPE`),
  UNIQUE KEY `UK_NETWORK_ELEMENT__CUSTOMER_ID_ID_RESOURCE_TYPE` (`CUSTOMER_ID`,`ID`,`RESOURCE_TYPE`),
  UNIQUE KEY `UK_NETWORK_ELEMENT__RESOURCE_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`RESOURCE_TYPE`),
  UNIQUE KEY `UK_NETWORK_ELEMENT__NETWORK_ELEMENT_NAME` (`CUSTOMER_ID`,`NETWORK_ELEMENT_NAME`,`LIVE_FLAG`),
  KEY `IDX_NETWORK_ELEMENT__DECOMMISSIONED_BY` (`CUSTOMER_ID`,`DECOMMISSIONED_BY_FK`),
  KEY `IDX_NETWORK_ELEMENT__PARENT_NETWORK_ELEMENT_ID` (`CUSTOMER_ID`,`PARENT_NETWORK_ELEMENT_ID_FK`),
  KEY `IDX_NETWORK_ELEMENT__SITE_ID_NETWORK_ELEMENT_TYPE` (`CUSTOMER_ID`,`SITE_ID_FK`,`NETWORK_ELEMENT_TYPE`),
  KEY `IDX_NETWORK_ELEMENT__SITE_ID_RACK_ID` (`CUSTOMER_ID`,`SITE_ID_FK`,`RACK_ID_FK`),
  KEY `IDX_NETWORK_ELEMENT__VENDOR_ID_FK` (`VENDOR_ID_FK`),
  KEY `IDX_NETWORK_ELEMENT__VENDOR_MODEL_TYPE` (`VENDOR_ID_FK`,`PRODUCT_MODEL_ID_FK`,`NETWORK_ELEMENT_TYPE`),
  KEY `IDX_NETWORK_ELEMENT__NETWORK_ELEMENT_TYPE_DOMAIN_ID` (`NETWORK_ELEMENT_TYPE`,`DOMAIN_ID_FK`),
  KEY `IDX_NETWORK_ELEMENT__DOMAIN_ID` (`DOMAIN_ID_FK`),
  KEY `IDX_NETWORK_ELEMENT__NETWORK_ELEMENT_TYPE_STOCK_STATE` (`CUSTOMER_ID`,`NETWORK_ELEMENT_TYPE`,`STOCK_STATE`),
  KEY `IDX_NETWORK_ELEMENT__DOMAIN_ID_RECONCILIATION_STATE` (`CUSTOMER_ID`,`DOMAIN_ID_FK`,`RECONCILIATION_STATE`),
  KEY `IDX_NETWORK_ELEMENT__MANAGEMENT_IP_BINARY` (`CUSTOMER_ID`,`MANAGEMENT_IP_BINARY`),
  KEY `IDX_NETWORK_ELEMENT__SERIAL_NUMBER` (`CUSTOMER_ID`,`SERIAL_NUMBER`),
  KEY `IDX_NETWORK_ELEMENT__MAC_ADDRESS` (`CUSTOMER_ID`,`MAC_ADDRESS`),
  CONSTRAINT `FK_NETWORK_ELEMENT__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT__DECOMMISSIONED_BY` FOREIGN KEY (`CUSTOMER_ID`, `DECOMMISSIONED_BY_FK`) REFERENCES `USER` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT__DOMAIN_ID` FOREIGN KEY (`DOMAIN_ID_FK`) REFERENCES `DOMAIN` (`ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT__NETWORK_ELEMENT_TYPE_DOMAIN` FOREIGN KEY (`NETWORK_ELEMENT_TYPE`, `DOMAIN_ID_FK`) REFERENCES `NETWORK_ELEMENT_TYPE_DOMAIN` (`NETWORK_ELEMENT_TYPE_CODE`, `DOMAIN_ID_FK`),
  CONSTRAINT `FK_NETWORK_ELEMENT__PARENT_NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `PARENT_NETWORK_ELEMENT_ID_FK`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT__PRODUCT_MODEL` FOREIGN KEY (`VENDOR_ID_FK`, `PRODUCT_MODEL_ID_FK`, `NETWORK_ELEMENT_TYPE`) REFERENCES `PRODUCT_MODEL` (`VENDOR_ID_FK`, `ID`, `NETWORK_ELEMENT_TYPE`),
  CONSTRAINT `FK_NETWORK_ELEMENT__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `FK_NETWORK_ELEMENT__SITE_ID` FOREIGN KEY (`CUSTOMER_ID`, `SITE_ID_FK`) REFERENCES `SITE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT__SITE_ID_RACK_ID` FOREIGN KEY (`CUSTOMER_ID`, `SITE_ID_FK`, `RACK_ID_FK`) REFERENCES `RACK` (`CUSTOMER_ID`, `SITE_ID_FK`, `ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT__VENDOR_ID` FOREIGN KEY (`VENDOR_ID_FK`) REFERENCES `VENDOR` (`ID`),
  CONSTRAINT `CK_NETWORK_ELEMENT__ADMIN_STATE_VALUES` CHECK ((`ADMIN_STATE` in (_utf8mb4'UNLOCKED',_utf8mb4'LOCKED',_utf8mb4'SHUTTING_DOWN'))),
  CONSTRAINT `CK_NETWORK_ELEMENT__DECOMMISSION_REASON_VALUES` CHECK ((`DECOMMISSION_REASON` in (_utf8mb4'CHANGE_REQUEST_REPLACEMENT',_utf8mb4'END_OF_LIFE',_utf8mb4'END_OF_SUPPORT',_utf8mb4'FAULTY_RETURNED',_utf8mb4'SITE_CONSOLIDATION',_utf8mb4'CAPACITY_MIGRATION',_utf8mb4'HARDWARE_REFRESH',_utf8mb4'WRITTEN_OFF',_utf8mb4'LEASE_EXPIRED',_utf8mb4'RING_REDESIGN',_utf8mb4'TECHNOLOGY_UPGRADE',_utf8mb4'OTHER'))),
  CONSTRAINT `CK_NETWORK_ELEMENT__DECOMMISSIONED` CHECK ((((`STOCK_STATE` = _utf8mb4'DECOMMISSIONED') = (`DECOMMISSIONED_TIME` is not null)) and ((`DECOMMISSIONED_TIME` is null) or (`DECOMMISSION_REASON` is not null)))),
  CONSTRAINT `CK_NETWORK_ELEMENT__IS_VIRTUAL` CHECK ((`IS_VIRTUAL` in (0,1))),
  CONSTRAINT `CK_NETWORK_ELEMENT__MAC` CHECK (((`MAC_ADDRESS` is null) or regexp_like(`MAC_ADDRESS`,_utf8mb4'^[0-9a-f]{2}(:[0-9a-f]{2}){5}$',_utf8mb4'c'))),
  CONSTRAINT `CK_NETWORK_ELEMENT__MANAGEMENT_IP` CHECK (((`MANAGEMENT_IP` is null) or is_ipv4(`MANAGEMENT_IP`) or is_ipv6(`MANAGEMENT_IP`))),
  CONSTRAINT `CK_NETWORK_ELEMENT__MODEL_NEEDS_VENDOR` CHECK (((`PRODUCT_MODEL_ID_FK` is null) or (`VENDOR_ID_FK` is not null))),
  CONSTRAINT `CK_NETWORK_ELEMENT__OPERATIONAL_STATUS_VALUES` CHECK ((`OPERATIONAL_STATUS` in (_utf8mb4'READY',_utf8mb4'PLANNED',_utf8mb4'UP',_utf8mb4'DOWN',_utf8mb4'DEGRADED',_utf8mb4'UNKNOWN'))),
  CONSTRAINT `CK_NETWORK_ELEMENT__RACK_UNITS` CHECK ((((`RACK_UNIT_START` is null) = (`RACK_UNIT_END` is null)) and ((`RACK_UNIT_START` is null) or ((`RACK_ID_FK` is not null) and (`RACK_UNIT_START` between 1 and 60) and (`RACK_UNIT_END` >= `RACK_UNIT_START`))))),
  CONSTRAINT `CK_NETWORK_ELEMENT__RECONCILIATION_STATE_VALUES` CHECK ((`RECONCILIATION_STATE` in (_utf8mb4'VERIFIED',_utf8mb4'DRIFTED',_utf8mb4'STALE',_utf8mb4'MISSING',_utf8mb4'DUPLICATE',_utf8mb4'NOT_DISCOVERED'))),
  CONSTRAINT `CK_NETWORK_ELEMENT__RECORD_SOURCE_VALUES` CHECK ((`RECORD_SOURCE` in (_utf8mb4'DISCOVERED',_utf8mb4'PLANNED_CIQ',_utf8mb4'MANUAL',_utf8mb4'EMS',_utf8mb4'EXTERNAL_SYNC'))),
  CONSTRAINT `CK_NETWORK_ELEMENT__STOCK_STATE_VALUES` CHECK ((`STOCK_STATE` in (_utf8mb4'PLANNED',_utf8mb4'IN_STORE',_utf8mb4'IN_TRANSIT',_utf8mb4'DEPLOYED',_utf8mb4'FAULTY_RMA',_utf8mb4'DECOMMISSIONED'))),
  CONSTRAINT `CK_NETWORK_ELEMENT__VIRTUAL_NOT_RACKED` CHECK (((`IS_VIRTUAL` = 0) or (`RACK_ID_FK` is null)))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Golden record of a physical or virtual device / network function in any domain. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_ELEMENT`
--

LOCK TABLES `NETWORK_ELEMENT` WRITE;
/*!40000 ALTER TABLE `NETWORK_ELEMENT` DISABLE KEYS */;
INSERT INTO `NETWORK_ELEMENT` (`ID`, `CUSTOMER_ID`, `RESOURCE_ID_FK`, `IS_VIRTUAL`, `NETWORK_ELEMENT_NAME`, `NETWORK_ELEMENT_TYPE`, `DOMAIN_ID_FK`, `VENDOR_ID_FK`, `PRODUCT_MODEL_ID_FK`, `SERIAL_NUMBER`, `MANAGEMENT_IP`, `MAC_ADDRESS`, `OS_VERSION`, `SOFTWARE_BUILD_NUMBER`, `CONFIG_TEMPLATE`, `SITE_ID_FK`, `RACK_ID_FK`, `RACK_UNIT_START`, `RACK_UNIT_END`, `PARENT_NETWORK_ELEMENT_ID_FK`, `STOCK_STATE`, `OPERATIONAL_STATUS`, `ADMIN_STATE`, `RECORD_SOURCE`, `RECONCILIATION_STATE`, `LAST_VERIFIED_TIME`, `LAST_SEEN_TIME`, `DECOMMISSIONED_TIME`, `DECOMMISSION_REASON`, `DECOMMISSIONED_BY_FK`, `WORK_ORDER_REFERENCE`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`, `IS_DELETED`) VALUES (1,1,7,0,'BLR-AGG-R07','ROUTER',4,1,1,'FOX2233A1B7','10.20.7.1','00:1a:2b:3c:4d:01','7.9.1',NULL,NULL,2,1,12,21,NULL,'DEPLOYED','UP','UNLOCKED','DISCOVERED','DRIFTED','2026-09-25 02:10:11.000','2026-09-25 01:58:03.000',NULL,NULL,NULL,NULL,'2026-09-28 08:15:11.542',1,'2026-09-28 08:15:11.542',1,0,0),(2,1,8,0,'BLR-CO-SW01','SWITCH',4,1,2,'FDO2410XY12','10.20.7.2','00:1a:2b:3c:4d:02','10.2(5)',NULL,NULL,2,1,22,22,NULL,'DEPLOYED','UP','UNLOCKED','DISCOVERED','VERIFIED','2026-09-25 02:10:11.000','2026-09-25 01:58:05.000',NULL,NULL,NULL,NULL,'2026-09-28 08:15:11.542',1,'2026-09-28 08:15:11.542',1,0,0),(3,1,9,0,'BLR-CO-ROADM1','OPTICAL',5,4,3,'CIE65001234','10.20.7.10',NULL,'12.7.1',NULL,NULL,2,1,1,7,NULL,'DEPLOYED','UP','UNLOCKED','EMS','STALE','2026-08-30 03:00:00.000','2026-08-30 03:00:00.000',NULL,NULL,NULL,NULL,'2026-09-28 08:15:11.542',1,'2026-09-28 08:15:11.542',1,0,0),(4,1,10,0,'BLR-277-GNB','GNODEB',1,2,4,'ERI6630A778','10.40.27.7',NULL,'22.Q4',NULL,NULL,1,3,3,3,NULL,'DEPLOYED','UP','UNLOCKED','EMS','DRIFTED','2026-09-25 03:00:00.000','2026-09-25 03:00:00.000',NULL,NULL,NULL,NULL,'2026-09-28 08:15:11.542',1,'2026-09-28 08:15:11.542',1,0,0),(5,1,11,0,'BLR-277-RU-S1','RADIO_UNIT',1,2,5,'ERI6449R001',NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,'DEPLOYED','UP','UNLOCKED','EMS','VERIFIED','2026-09-25 03:00:00.000','2026-09-25 03:00:00.000',NULL,NULL,NULL,NULL,'2026-09-28 08:15:11.542',1,'2026-09-28 08:15:11.542',1,0,0),(6,1,12,0,'DC-A01-SRV01','SERVER',8,5,6,'DLL7XR76001','10.30.1.11','00:1a:2b:3c:4d:06','RHEL 9.4',NULL,NULL,3,2,10,11,NULL,'DEPLOYED','UP','UNLOCKED','DISCOVERED','VERIFIED','2026-09-25 02:20:00.000','2026-09-25 02:20:00.000',NULL,NULL,NULL,NULL,'2026-09-28 08:15:11.542',1,'2026-09-28 08:15:11.542',1,0,0),(7,1,13,1,'vAMF-01','CORE_NF',2,3,10,NULL,'10.30.5.21',NULL,'24.3',NULL,NULL,3,NULL,NULL,NULL,NULL,'DEPLOYED','UP','UNLOCKED','DISCOVERED','VERIFIED','2026-09-25 02:20:00.000','2026-09-25 02:20:00.000',NULL,NULL,NULL,NULL,'2026-09-28 08:15:11.542',1,'2026-09-28 08:15:11.542',1,0,0),(8,1,14,0,'BLR-277-RECT','POWER_CONTROLLER',9,2,11,'RCT48V00277','10.40.27.9',NULL,'3.1',NULL,NULL,1,3,1,1,NULL,'DEPLOYED','UP','UNLOCKED','MANUAL','NOT_DISCOVERED',NULL,NULL,NULL,NULL,NULL,NULL,'2026-09-28 08:15:11.542',1,'2026-09-28 08:15:11.542',1,0,0);
/*!40000 ALTER TABLE `NETWORK_ELEMENT` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_ELEMENT_CORE_DETAIL`
--

DROP TABLE IF EXISTS `NETWORK_ELEMENT_CORE_DETAIL`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_ELEMENT_CORE_DETAIL` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1)',
  `NETWORK_ELEMENT_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE)',
  `DETAIL_TABLE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NETWORK_ELEMENT_CORE_DETAIL' COMMENT 'Constant NETWORK_ELEMENT_CORE_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted',
  `NETWORK_FUNCTION_TYPE_CODE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'FK NETWORK_FUNCTION_TYPE.CODE (AMF, SMF, UPF, MME, P_CSCF ...); its segment (EPC / 5GC / IMS) comes from the catalog',
  `REDUNDANCY_ROLE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NONE' COMMENT 'Role within a redundant pool. Values: ACTIVE, STANDBY, LOAD_SHARED, NONE',
  `POOL_CODE` varchar(50) DEFAULT NULL COMMENT 'Pool / set identifier (AMF set, MME pool)',
  `POOL_NAME` varchar(100) DEFAULT NULL COMMENT 'Pool / set name',
  `MAX_SESSION_CAPACITY` int unsigned DEFAULT NULL COMMENT 'Licensed subscriber / session capacity',
  `THROUGHPUT_CAPACITY_GBPS` decimal(10,2) DEFAULT NULL COMMENT 'Rated throughput capacity, Gbps',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_CORE_DETAIL__NETWORK_ELEMENT_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`NETWORK_ELEMENT_TYPE`),
  KEY `IDX_NETWORK_ELEMENT_CORE_DETAIL__NE_TYPE_DETAIL_TABLE` (`NETWORK_ELEMENT_TYPE`,`DETAIL_TABLE`),
  KEY `IDX_NETWORK_ELEMENT_CORE_DETAIL__NETWORK_FUNCTION_TYPE_CODE` (`NETWORK_FUNCTION_TYPE_CODE`),
  KEY `IDX_NETWORK_ELEMENT_CORE_DETAIL__POOL_CODE` (`CUSTOMER_ID`,`POOL_CODE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_CORE_DETAIL__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_CORE_DETAIL__NE_TYPE_DETAIL_TABLE` FOREIGN KEY (`NETWORK_ELEMENT_TYPE`, `DETAIL_TABLE`) REFERENCES `NETWORK_ELEMENT_TYPE` (`CODE`, `DETAIL_TABLE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_CORE_DETAIL__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`, `NETWORK_ELEMENT_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `FK_NETWORK_ELEMENT_CORE_DETAIL__NETWORK_FUNCTION_TYPE_CODE` FOREIGN KEY (`NETWORK_FUNCTION_TYPE_CODE`) REFERENCES `NETWORK_FUNCTION_TYPE` (`CODE`),
  CONSTRAINT `CK_NE_CORE_DETAIL__THROUGHPUT_CAPACITY_GBPS_NON_NEGATIVE` CHECK (((`THROUGHPUT_CAPACITY_GBPS` is null) or (`THROUGHPUT_CAPACITY_GBPS` >= 0))),
  CONSTRAINT `CK_NETWORK_ELEMENT_CORE_DETAIL__DETAIL_TABLE` CHECK ((`DETAIL_TABLE` = _utf8mb4'NETWORK_ELEMENT_CORE_DETAIL')),
  CONSTRAINT `CK_NETWORK_ELEMENT_CORE_DETAIL__POOL` CHECK (((`POOL_NAME` is null) or (`POOL_CODE` is not null))),
  CONSTRAINT `CK_NETWORK_ELEMENT_CORE_DETAIL__REDUNDANCY_ROLE_VALUES` CHECK ((`REDUNDANCY_ROLE` in (_utf8mb4'ACTIVE',_utf8mb4'STANDBY',_utf8mb4'LOAD_SHARED',_utf8mb4'NONE')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Core / IMS / CS network-function attributes (1:1 with NETWORK_ELEMENT). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_ELEMENT_CORE_DETAIL`
--

LOCK TABLES `NETWORK_ELEMENT_CORE_DETAIL` WRITE;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_CORE_DETAIL` DISABLE KEYS */;
INSERT INTO `NETWORK_ELEMENT_CORE_DETAIL` VALUES (1,1,7,'CORE_NF','NETWORK_ELEMENT_CORE_DETAIL','AMF','ACTIVE','AMF-POOL-SOUTH','AMF pool South',2000000,NULL,'2026-09-28 08:15:11.549',1,'2026-09-28 08:15:11.549',1,0);
/*!40000 ALTER TABLE `NETWORK_ELEMENT_CORE_DETAIL` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_ELEMENT_HEALTH`
--

DROP TABLE IF EXISTS `NETWORK_ELEMENT_HEALTH`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_ELEMENT_HEALTH` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID',
  `REACHABILITY` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'UNKNOWN' COMMENT 'ICMP reachability. Values: REACHABLE, UNREACHABLE, DEGRADED, UNKNOWN',
  `PACKET_LOSS_PERCENT` decimal(5,2) DEFAULT NULL COMMENT 'Packet loss %',
  `LATENCY_AVERAGE_MS` decimal(8,2) DEFAULT NULL COMMENT 'Average round trip, ms',
  `AVAILABILITY_24H_PERCENT` decimal(5,2) DEFAULT NULL COMMENT 'Availability over the last 24 h, %',
  `NTP_STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'UNKNOWN' COMMENT 'NTP synchronisation. Values: SYNCED, UNSYNCED, UNKNOWN',
  `NTP_OFFSET_MS` decimal(10,3) DEFAULT NULL COMMENT 'Clock offset from NTP, ms',
  `NTP_STRATUM` tinyint unsigned DEFAULT NULL COMMENT 'NTP stratum',
  `CHECKED_TIME` datetime(3) NOT NULL COMMENT 'When checked (UTC)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_HEALTH__NETWORK_ELEMENT_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`),
  CONSTRAINT `FK_NETWORK_ELEMENT_HEALTH__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_HEALTH__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `CK_NETWORK_ELEMENT_HEALTH__LATENCY_AVERAGE_MS_NON_NEGATIVE` CHECK (((`LATENCY_AVERAGE_MS` is null) or (`LATENCY_AVERAGE_MS` >= 0))),
  CONSTRAINT `CK_NETWORK_ELEMENT_HEALTH__NTP_STATUS_VALUES` CHECK ((`NTP_STATUS` in (_utf8mb4'SYNCED',_utf8mb4'UNSYNCED',_utf8mb4'UNKNOWN'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_HEALTH__PERCENT` CHECK ((((`PACKET_LOSS_PERCENT` is null) or (`PACKET_LOSS_PERCENT` between 0 and 100)) and ((`AVAILABILITY_24H_PERCENT` is null) or (`AVAILABILITY_24H_PERCENT` between 0 and 100)))),
  CONSTRAINT `CK_NETWORK_ELEMENT_HEALTH__REACHABILITY_VALUES` CHECK ((`REACHABILITY` in (_utf8mb4'REACHABLE',_utf8mb4'UNREACHABLE',_utf8mb4'DEGRADED',_utf8mb4'UNKNOWN'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_HEALTH__STRATUM` CHECK (((`NTP_STRATUM` is null) or (`NTP_STRATUM` between 0 and 16)))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Latest reachability and time-sync check of a device (ICMP + NTP). History belongs to performance management. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_ELEMENT_HEALTH`
--

LOCK TABLES `NETWORK_ELEMENT_HEALTH` WRITE;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_HEALTH` DISABLE KEYS */;
INSERT INTO `NETWORK_ELEMENT_HEALTH` VALUES (1,1,1,'REACHABLE',0.00,2.40,100.00,'SYNCED',0.412,2,'2026-09-25 01:58:03.000','2026-09-28 08:15:11.554',6,'2026-09-28 08:15:11.554',6,0),(2,1,2,'REACHABLE',0.00,1.90,100.00,'SYNCED',0.380,2,'2026-09-25 01:58:05.000','2026-09-28 08:15:11.554',6,'2026-09-28 08:15:11.554',6,0),(3,1,3,'UNREACHABLE',100.00,NULL,0.00,'UNKNOWN',NULL,NULL,'2026-09-25 01:58:09.000','2026-09-28 08:15:11.554',6,'2026-09-28 08:15:11.554',6,0),(4,1,4,'REACHABLE',0.10,6.80,99.98,'SYNCED',0.050,1,'2026-09-25 03:00:00.000','2026-09-28 08:15:11.554',6,'2026-09-28 08:15:11.554',6,0);
/*!40000 ALTER TABLE `NETWORK_ELEMENT_HEALTH` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_ELEMENT_IP_MPLS_DETAIL`
--

DROP TABLE IF EXISTS `NETWORK_ELEMENT_IP_MPLS_DETAIL`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_ELEMENT_IP_MPLS_DETAIL` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1)',
  `NETWORK_ELEMENT_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE)',
  `DETAIL_TABLE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NETWORK_ELEMENT_IP_MPLS_DETAIL' COMMENT 'Constant NETWORK_ELEMENT_IP_MPLS_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted',
  `ROUTER_ROLE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Role in the IP/MPLS network. Values: PE, P, CE, RR, ASBR, AGGREGATION, ACCESS',
  `ROUTER_ID` varchar(15) DEFAULT NULL COMMENT 'IGP / BGP router-id (IPv4 dotted)',
  `LOOPBACK_IP` varchar(45) DEFAULT NULL COMMENT 'Loopback address (IPv4 or IPv6 text form)',
  `AS_NUMBER` int unsigned DEFAULT NULL COMMENT 'Autonomous system number (2- or 4-byte)',
  `IGP_PROTOCOL` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NONE' COMMENT 'Interior gateway protocol. Values: OSPF, ISIS, NONE',
  `MPLS_ENABLED` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 when MPLS forwarding is enabled',
  `LDP_ENABLED` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 when LDP label distribution is enabled',
  `RSVP_TE_ENABLED` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 when RSVP-TE is enabled',
  `SEGMENT_ROUTING_ENABLED` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 when segment routing (SR-MPLS / SRv6) is enabled',
  `BGP_ENABLED` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 when BGP runs on the node',
  `LABEL_RANGE_START` int unsigned DEFAULT NULL COMMENT 'Start of the local MPLS label range (0-1048575)',
  `LABEL_RANGE_END` int unsigned DEFAULT NULL COMMENT 'End of the local MPLS label range',
  `VRF_COUNT` smallint unsigned DEFAULT NULL COMMENT 'VRFs configured, as reported at discovery (the instances are SERVICE_INSTANCE rows)',
  `QOS_PROFILE` varchar(50) DEFAULT NULL COMMENT 'QoS policy applied on the node',
  `CORE_MTU` smallint unsigned DEFAULT NULL COMMENT 'MTU on core-facing interfaces, bytes',
  `REDUNDANCY_ROLE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NONE' COMMENT 'Role within a redundant pair. Values: ACTIVE, STANDBY, LOAD_SHARED, NONE',
  `CHASSIS_REDUNDANCY` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NONE' COMMENT 'Control-plane redundancy of the chassis. Values: NONE, DUAL_RE, DUAL_RE_ISSU',
  `BACKPLANE_CAPACITY_GBPS` decimal(10,2) DEFAULT NULL COMMENT 'Backplane switching capacity, Gbps',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_IP_MPLS_DETAIL__NETWORK_ELEMENT_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`NETWORK_ELEMENT_TYPE`),
  KEY `IDX_NETWORK_ELEMENT_IP_MPLS_DETAIL__NE_TYPE_DETAIL_TABLE` (`NETWORK_ELEMENT_TYPE`,`DETAIL_TABLE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_IP_MPLS_DETAIL__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_IP_MPLS_DETAIL__NE_TYPE_DETAIL_TABLE` FOREIGN KEY (`NETWORK_ELEMENT_TYPE`, `DETAIL_TABLE`) REFERENCES `NETWORK_ELEMENT_TYPE` (`CODE`, `DETAIL_TABLE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_IP_MPLS_DETAIL__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`, `NETWORK_ELEMENT_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `CK_NE_IP_MPLS_DETAIL__BACKPLANE_CAPACITY_GBPS_NON_NEGATIVE` CHECK (((`BACKPLANE_CAPACITY_GBPS` is null) or (`BACKPLANE_CAPACITY_GBPS` >= 0))),
  CONSTRAINT `CK_NETWORK_ELEMENT_IP_MPLS_DETAIL__ASN` CHECK (((`AS_NUMBER` is null) or (`AS_NUMBER` between 1 and 4294967294))),
  CONSTRAINT `CK_NETWORK_ELEMENT_IP_MPLS_DETAIL__CHASSIS_REDUNDANCY_VALUES` CHECK ((`CHASSIS_REDUNDANCY` in (_utf8mb4'NONE',_utf8mb4'DUAL_RE',_utf8mb4'DUAL_RE_ISSU'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_IP_MPLS_DETAIL__DETAIL_TABLE` CHECK ((`DETAIL_TABLE` = _utf8mb4'NETWORK_ELEMENT_IP_MPLS_DETAIL')),
  CONSTRAINT `CK_NETWORK_ELEMENT_IP_MPLS_DETAIL__IGP_PROTOCOL_VALUES` CHECK ((`IGP_PROTOCOL` in (_utf8mb4'OSPF',_utf8mb4'ISIS',_utf8mb4'NONE'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_IP_MPLS_DETAIL__IPS` CHECK ((((`ROUTER_ID` is null) or is_ipv4(`ROUTER_ID`)) and ((`LOOPBACK_IP` is null) or is_ipv4(`LOOPBACK_IP`) or is_ipv6(`LOOPBACK_IP`)))),
  CONSTRAINT `CK_NETWORK_ELEMENT_IP_MPLS_DETAIL__LABELS` CHECK ((((`LABEL_RANGE_START` is null) = (`LABEL_RANGE_END` is null)) and ((`LABEL_RANGE_END` is null) or ((`LABEL_RANGE_END` <= 1048575) and (`LABEL_RANGE_START` <= `LABEL_RANGE_END`))))),
  CONSTRAINT `CK_NETWORK_ELEMENT_IP_MPLS_DETAIL__REDUNDANCY_ROLE_VALUES` CHECK ((`REDUNDANCY_ROLE` in (_utf8mb4'ACTIVE',_utf8mb4'STANDBY',_utf8mb4'LOAD_SHARED',_utf8mb4'NONE'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_IP_MPLS_DETAIL__ROUTER_ROLE_VALUES` CHECK ((`ROUTER_ROLE` in (_utf8mb4'PE',_utf8mb4'P',_utf8mb4'CE',_utf8mb4'RR',_utf8mb4'ASBR',_utf8mb4'AGGREGATION',_utf8mb4'ACCESS')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='IP / MPLS routing role and protocol configuration of a router (1:1 with NETWORK_ELEMENT; Transport > IP/MPLS domain). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_ELEMENT_IP_MPLS_DETAIL`
--

LOCK TABLES `NETWORK_ELEMENT_IP_MPLS_DETAIL` WRITE;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_IP_MPLS_DETAIL` DISABLE KEYS */;
INSERT INTO `NETWORK_ELEMENT_IP_MPLS_DETAIL` VALUES (1,1,1,'ROUTER','NETWORK_ELEMENT_IP_MPLS_DETAIL','PE','10.255.0.7','10.255.0.7',64512,'ISIS',1,1,0,1,1,16000,23999,14,'QOS-AGG-01',9216,'ACTIVE','DUAL_RE',3200.00,'2026-09-28 08:15:11.544',1,'2026-09-28 08:15:11.544',1,0);
/*!40000 ALTER TABLE `NETWORK_ELEMENT_IP_MPLS_DETAIL` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_ELEMENT_MICROWAVE_DETAIL`
--

DROP TABLE IF EXISTS `NETWORK_ELEMENT_MICROWAVE_DETAIL`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_ELEMENT_MICROWAVE_DETAIL` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1)',
  `NETWORK_ELEMENT_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE)',
  `DETAIL_TABLE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NETWORK_ELEMENT_MICROWAVE_DETAIL' COMMENT 'Constant NETWORK_ELEMENT_MICROWAVE_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted',
  `OUTDOOR_UNIT_MODEL` varchar(100) DEFAULT NULL COMMENT 'Outdoor unit model',
  `INDOOR_UNIT_MODEL` varchar(100) DEFAULT NULL COMMENT 'Indoor unit model',
  `ANTENNA_DIAMETER_M` decimal(4,2) DEFAULT NULL COMMENT 'Dish diameter, metres',
  `ANTENNA_GAIN_DBI` decimal(5,2) DEFAULT NULL COMMENT 'Antenna gain, dBi',
  `TRANSMIT_POWER_DBM` decimal(5,2) DEFAULT NULL COMMENT 'Configured transmit power, dBm',
  `ATPC_ENABLED` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 when automatic transmit power control is on',
  `XPIC_ENABLED` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 when cross-polarisation interference cancellation is on',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_MICROWAVE_DETAIL__NETWORK_ELEMENT_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`NETWORK_ELEMENT_TYPE`),
  KEY `IDX_NETWORK_ELEMENT_MICROWAVE_DETAIL__NE_TYPE_DETAIL_TABLE` (`NETWORK_ELEMENT_TYPE`,`DETAIL_TABLE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_MICROWAVE_DETAIL__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_MICROWAVE_DETAIL__NE_TYPE_DETAIL_TABLE` FOREIGN KEY (`NETWORK_ELEMENT_TYPE`, `DETAIL_TABLE`) REFERENCES `NETWORK_ELEMENT_TYPE` (`CODE`, `DETAIL_TABLE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_MICROWAVE_DETAIL__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`, `NETWORK_ELEMENT_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `CK_NETWORK_ELEMENT_MICROWAVE_DETAIL__ANTENNA` CHECK ((((`ANTENNA_DIAMETER_M` is null) or (`ANTENNA_DIAMETER_M` > 0)) and ((`TRANSMIT_POWER_DBM` is null) or (`TRANSMIT_POWER_DBM` between -(30) and 40)))),
  CONSTRAINT `CK_NETWORK_ELEMENT_MICROWAVE_DETAIL__DETAIL_TABLE` CHECK ((`DETAIL_TABLE` = _utf8mb4'NETWORK_ELEMENT_MICROWAVE_DETAIL'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Microwave terminal attributes (1:1 with NETWORK_ELEMENT); hop attributes live on the link. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_ELEMENT_MICROWAVE_DETAIL`
--

LOCK TABLES `NETWORK_ELEMENT_MICROWAVE_DETAIL` WRITE;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_MICROWAVE_DETAIL` DISABLE KEYS */;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_MICROWAVE_DETAIL` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_ELEMENT_MOVEMENT`
--

DROP TABLE IF EXISTS `NETWORK_ELEMENT_MOVEMENT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_ELEMENT_MOVEMENT` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID',
  `FROM_STATE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Stock state before. Values: PLANNED, IN_STORE, IN_TRANSIT, DEPLOYED, FAULTY_RMA, DECOMMISSIONED',
  `TO_STATE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Stock state after. Values: PLANNED, IN_STORE, IN_TRANSIT, DEPLOYED, FAULTY_RMA, DECOMMISSIONED',
  `FROM_SITE_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK SITE.ID: where it came from (warehouse or site)',
  `TO_SITE_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK SITE.ID: where it went',
  `MOVED_TIME` datetime(3) NOT NULL COMMENT 'When (UTC)',
  `WORK_ORDER_REFERENCE` varchar(40) DEFAULT NULL COMMENT 'Work order reference',
  `REMARKS` varchar(500) DEFAULT NULL COMMENT 'Remarks',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_MOVEMENT__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  KEY `IDX_NETWORK_ELEMENT_MOVEMENT__FROM_STATE_TO_STATE` (`FROM_STATE`,`TO_STATE`),
  KEY `IDX_NETWORK_ELEMENT_MOVEMENT__TO_SITE_ID` (`CUSTOMER_ID`,`TO_SITE_ID_FK`),
  KEY `IDX_NETWORK_ELEMENT_MOVEMENT__FROM_SITE_ID` (`CUSTOMER_ID`,`FROM_SITE_ID_FK`),
  KEY `IDX_NETWORK_ELEMENT_MOVEMENT__NETWORK_ELEMENT_ID_MOVED_TIME` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`MOVED_TIME`),
  CONSTRAINT `FK_NETWORK_ELEMENT_MOVEMENT__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_MOVEMENT__FROM_SITE_ID` FOREIGN KEY (`CUSTOMER_ID`, `FROM_SITE_ID_FK`) REFERENCES `SITE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_MOVEMENT__FROM_STATE_TO_STATE` FOREIGN KEY (`FROM_STATE`, `TO_STATE`) REFERENCES `NETWORK_ELEMENT_STOCK_TRANSITION` (`FROM_STATE`, `TO_STATE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_MOVEMENT__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_MOVEMENT__TO_SITE_ID` FOREIGN KEY (`CUSTOMER_ID`, `TO_SITE_ID_FK`) REFERENCES `SITE` (`CUSTOMER_ID`, `ID`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Append-only stock movement (the application never updates or deletes rows) / state change of a device (issue, install, RMA, decommission, recover to store) with its work order. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_ELEMENT_MOVEMENT`
--

LOCK TABLES `NETWORK_ELEMENT_MOVEMENT` WRITE;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_MOVEMENT` DISABLE KEYS */;
INSERT INTO `NETWORK_ELEMENT_MOVEMENT` VALUES (1,1,1,'PLANNED','IN_STORE',NULL,3,'2025-10-20 10:00:00.000','WO-77001','Received at Whitefield store','2026-09-28 08:15:11.555',2,'2026-09-28 08:15:11.555',2,0),(2,1,1,'IN_STORE','DEPLOYED',3,2,'2025-11-02 09:00:00.000','WO-77102','Installed in R-04 U12-21','2026-09-28 08:15:11.555',2,'2026-09-28 08:15:11.555',2,0);
/*!40000 ALTER TABLE `NETWORK_ELEMENT_MOVEMENT` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_ELEMENT_OPTICAL_DETAIL`
--

DROP TABLE IF EXISTS `NETWORK_ELEMENT_OPTICAL_DETAIL`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_ELEMENT_OPTICAL_DETAIL` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1)',
  `NETWORK_ELEMENT_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE)',
  `DETAIL_TABLE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NETWORK_ELEMENT_OPTICAL_DETAIL' COMMENT 'Constant NETWORK_ELEMENT_OPTICAL_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted',
  `TRANSPORT_ROLE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Role in the optical layer. Values: ROADM, OTN_SWITCH, DWDM_TERMINAL, MUXPONDER, TRANSPONDER, OPTICAL_AMPLIFIER',
  `OPTICAL_BAND` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Optical band in use. Values: C_BAND, L_BAND, O_BAND, S_BAND, C_AND_L_BAND',
  `ROADM_DEGREES` tinyint unsigned DEFAULT NULL COMMENT 'Degrees of a ROADM node',
  `WAVELENGTH_CAPACITY` smallint unsigned DEFAULT NULL COMMENT 'Wavelength channels the node supports',
  `WAVELENGTHS_IN_USE` smallint unsigned DEFAULT NULL COMMENT 'Channels in use as reported by the EMS at last discovery (the services are SERVICE_INSTANCE WAVELENGTH rows)',
  `CHANNEL_SPACING_GHZ` decimal(6,2) DEFAULT NULL COMMENT 'ITU grid spacing, GHz (50, 100, flex)',
  `LINE_RATE_GBPS` decimal(10,2) DEFAULT NULL COMMENT 'Per-wavelength line rate, Gbps',
  `MAX_CAPACITY_GBPS` decimal(10,2) DEFAULT NULL COMMENT 'Aggregate capacity of the node, Gbps',
  `AMPLIFIER_TYPE` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NONE' COMMENT 'Amplification technology. Values: EDFA, RAMAN, HYBRID, NONE',
  `PROTECTION_SCHEME` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NONE' COMMENT 'Optical-layer protection. Values: NONE, 1_PLUS_1, N_PLUS_1, RING, MESH_RESTORATION',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_OPTICAL_DETAIL__NETWORK_ELEMENT_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`NETWORK_ELEMENT_TYPE`),
  KEY `IDX_NETWORK_ELEMENT_OPTICAL_DETAIL__NE_TYPE_DETAIL_TABLE` (`NETWORK_ELEMENT_TYPE`,`DETAIL_TABLE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_OPTICAL_DETAIL__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_OPTICAL_DETAIL__NE_TYPE_DETAIL_TABLE` FOREIGN KEY (`NETWORK_ELEMENT_TYPE`, `DETAIL_TABLE`) REFERENCES `NETWORK_ELEMENT_TYPE` (`CODE`, `DETAIL_TABLE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_OPTICAL_DETAIL__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`, `NETWORK_ELEMENT_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `CK_NE_OPTICAL_DETAIL__CHANNEL_SPACING_GHZ_NON_NEGATIVE` CHECK (((`CHANNEL_SPACING_GHZ` is null) or (`CHANNEL_SPACING_GHZ` >= 0))),
  CONSTRAINT `CK_NE_OPTICAL_DETAIL__MAX_CAPACITY_GBPS_NON_NEGATIVE` CHECK (((`MAX_CAPACITY_GBPS` is null) or (`MAX_CAPACITY_GBPS` >= 0))),
  CONSTRAINT `CK_NETWORK_ELEMENT_OPTICAL_DETAIL__AMPLIFIER_TYPE_VALUES` CHECK ((`AMPLIFIER_TYPE` in (_utf8mb4'EDFA',_utf8mb4'RAMAN',_utf8mb4'HYBRID',_utf8mb4'NONE'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_OPTICAL_DETAIL__DETAIL_TABLE` CHECK ((`DETAIL_TABLE` = _utf8mb4'NETWORK_ELEMENT_OPTICAL_DETAIL')),
  CONSTRAINT `CK_NETWORK_ELEMENT_OPTICAL_DETAIL__LINE_RATE_GBPS_NON_NEGATIVE` CHECK (((`LINE_RATE_GBPS` is null) or (`LINE_RATE_GBPS` >= 0))),
  CONSTRAINT `CK_NETWORK_ELEMENT_OPTICAL_DETAIL__OPTICAL_BAND_VALUES` CHECK ((`OPTICAL_BAND` in (_utf8mb4'C_BAND',_utf8mb4'L_BAND',_utf8mb4'O_BAND',_utf8mb4'S_BAND',_utf8mb4'C_AND_L_BAND'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_OPTICAL_DETAIL__PROTECTION_SCHEME_VALUES` CHECK ((`PROTECTION_SCHEME` in (_utf8mb4'NONE',_utf8mb4'1_PLUS_1',_utf8mb4'N_PLUS_1',_utf8mb4'RING',_utf8mb4'MESH_RESTORATION'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_OPTICAL_DETAIL__TRANSPORT_ROLE_VALUES` CHECK ((`TRANSPORT_ROLE` in (_utf8mb4'ROADM',_utf8mb4'OTN_SWITCH',_utf8mb4'DWDM_TERMINAL',_utf8mb4'MUXPONDER',_utf8mb4'TRANSPONDER',_utf8mb4'OPTICAL_AMPLIFIER'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_OPTICAL_DETAIL__WAVELENGTHS` CHECK (((`WAVELENGTHS_IN_USE` is null) or (`WAVELENGTH_CAPACITY` is null) or (`WAVELENGTHS_IN_USE` <= `WAVELENGTH_CAPACITY`)))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='DWDM / OTN optical node attributes (1:1 with NETWORK_ELEMENT; Transport domain). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_ELEMENT_OPTICAL_DETAIL`
--

LOCK TABLES `NETWORK_ELEMENT_OPTICAL_DETAIL` WRITE;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_OPTICAL_DETAIL` DISABLE KEYS */;
INSERT INTO `NETWORK_ELEMENT_OPTICAL_DETAIL` VALUES (1,1,3,'OPTICAL','NETWORK_ELEMENT_OPTICAL_DETAIL','ROADM','C_BAND',4,96,41,50.00,200.00,19200.00,'EDFA','RING','2026-09-28 08:15:11.546',1,'2026-09-28 08:15:11.546',1,0);
/*!40000 ALTER TABLE `NETWORK_ELEMENT_OPTICAL_DETAIL` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_ELEMENT_PON_DETAIL`
--

DROP TABLE IF EXISTS `NETWORK_ELEMENT_PON_DETAIL`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_ELEMENT_PON_DETAIL` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1)',
  `NETWORK_ELEMENT_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE)',
  `DETAIL_TABLE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NETWORK_ELEMENT_PON_DETAIL' COMMENT 'Constant NETWORK_ELEMENT_PON_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted',
  `PON_TECHNOLOGY` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'PON generation. Values: GPON, EPON, XGPON, XGSPON, NGPON2, GFAST',
  `PARENT_OLT_NETWORK_ELEMENT_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK NETWORK_ELEMENT.ID: the OLT serving this ONU / ONT; NULL on an OLT',
  `SERVING_PON_PORT_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK PORT.ID: the OLT PON port serving this ONU / ONT; must belong to PARENT_OLT_NETWORK_ELEMENT_ID_FK',
  `ONU_ID` smallint unsigned DEFAULT NULL COMMENT 'ONU id on the PON (0-255)',
  `SPLIT_RATIO` smallint unsigned DEFAULT NULL COMMENT '1:N split of the serving PON branch (32, 64, 128)',
  `PON_PORT_COUNT` smallint unsigned DEFAULT NULL COMMENT 'PON ports on an OLT',
  `MAX_ONU_PER_PORT` smallint unsigned DEFAULT NULL COMMENT 'ONUs supported per PON port on an OLT',
  `SUBSCRIBER_REFERENCE` varchar(64) DEFAULT NULL COMMENT 'Subscriber / account reference in CRM or LCM (cross-module, not FK-enforced)',
  `SERVICE_PROFILE` varchar(64) DEFAULT NULL COMMENT 'Service / bandwidth profile provisioned on the ONT',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_PON_DETAIL__NETWORK_ELEMENT_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`NETWORK_ELEMENT_TYPE`),
  KEY `IDX_NETWORK_ELEMENT_PON_DETAIL__NE_TYPE_DETAIL_TABLE` (`NETWORK_ELEMENT_TYPE`,`DETAIL_TABLE`),
  KEY `IDX_NETWORK_ELEMENT_PON_DETAIL__PARENT_OLT_NETWORK_ELEMENT_ID_FK` (`CUSTOMER_ID`,`PARENT_OLT_NETWORK_ELEMENT_ID_FK`),
  KEY `IDX_NE_PON_DETAIL__PARENT_OLT_NE_ID_SERVING_PON_PORT_ID` (`CUSTOMER_ID`,`PARENT_OLT_NETWORK_ELEMENT_ID_FK`,`SERVING_PON_PORT_ID_FK`),
  CONSTRAINT `FK_NETWORK_ELEMENT_PON_DETAIL__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_PON_DETAIL__NE_TYPE_DETAIL_TABLE` FOREIGN KEY (`NETWORK_ELEMENT_TYPE`, `DETAIL_TABLE`) REFERENCES `NETWORK_ELEMENT_TYPE` (`CODE`, `DETAIL_TABLE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_PON_DETAIL__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`, `NETWORK_ELEMENT_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `FK_NETWORK_ELEMENT_PON_DETAIL__PARENT_OLT_NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `PARENT_OLT_NETWORK_ELEMENT_ID_FK`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_PON_DETAIL__SERVING_PON_PORT_ID` FOREIGN KEY (`CUSTOMER_ID`, `PARENT_OLT_NETWORK_ELEMENT_ID_FK`, `SERVING_PON_PORT_ID_FK`) REFERENCES `PORT` (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `ID`),
  CONSTRAINT `CK_NETWORK_ELEMENT_PON_DETAIL__DETAIL_TABLE` CHECK ((`DETAIL_TABLE` = _utf8mb4'NETWORK_ELEMENT_PON_DETAIL')),
  CONSTRAINT `CK_NETWORK_ELEMENT_PON_DETAIL__OLT` CHECK ((((`NETWORK_ELEMENT_TYPE` = _utf8mb4'OLT') = (`PARENT_OLT_NETWORK_ELEMENT_ID_FK` is null)) and ((`SERVING_PON_PORT_ID_FK` is null) or (`PARENT_OLT_NETWORK_ELEMENT_ID_FK` is not null)))),
  CONSTRAINT `CK_NETWORK_ELEMENT_PON_DETAIL__ONU_ID` CHECK (((`ONU_ID` is null) or (`ONU_ID` <= 255))),
  CONSTRAINT `CK_NETWORK_ELEMENT_PON_DETAIL__PON_TECHNOLOGY_VALUES` CHECK ((`PON_TECHNOLOGY` in (_utf8mb4'GPON',_utf8mb4'EPON',_utf8mb4'XGPON',_utf8mb4'XGSPON',_utf8mb4'NGPON2',_utf8mb4'GFAST')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='PON access node attributes for OLT / ONU / ONT (1:1 with NETWORK_ELEMENT; Transport domain). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_ELEMENT_PON_DETAIL`
--

LOCK TABLES `NETWORK_ELEMENT_PON_DETAIL` WRITE;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_PON_DETAIL` DISABLE KEYS */;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_PON_DETAIL` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_ELEMENT_POWER_DETAIL`
--

DROP TABLE IF EXISTS `NETWORK_ELEMENT_POWER_DETAIL`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_ELEMENT_POWER_DETAIL` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1)',
  `NETWORK_ELEMENT_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE)',
  `DETAIL_TABLE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NETWORK_ELEMENT_POWER_DETAIL' COMMENT 'Constant NETWORK_ELEMENT_POWER_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted',
  `POWER_NODE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Kind of controller. Values: RECTIFIER_SYSTEM, SMART_PDU, UPS_CONTROLLER, SOLAR_CONTROLLER, GENSET_CONTROLLER, FUEL_SENSOR_UNIT, BATTERY_MONITOR',
  `POWER_UNIT_EXTERNAL_RESOURCE_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK EXTERNAL_RESOURCE.ID: proxy of the power plant unit this controller manages; the unit is owned by Passive Inventory',
  `MONITORING_PROTOCOL` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Protocol the controller is polled with. Values: SNMP, MODBUS, REST, PROPRIETARY',
  `NOMINAL_DC_VOLTAGE` decimal(5,1) DEFAULT NULL COMMENT 'Nominal DC bus voltage (48.0)',
  `RATED_CAPACITY_KW` decimal(7,2) DEFAULT NULL COMMENT 'Rated output capacity, kW',
  `DESIGN_BACKUP_MINUTES` smallint unsigned DEFAULT NULL COMMENT 'Designed battery autonomy at full load, minutes',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_POWER_DETAIL__NETWORK_ELEMENT_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`NETWORK_ELEMENT_TYPE`),
  KEY `IDX_NETWORK_ELEMENT_POWER_DETAIL__NE_TYPE_DETAIL_TABLE` (`NETWORK_ELEMENT_TYPE`,`DETAIL_TABLE`),
  KEY `IDX_NETWORK_ELEMENT_POWER_DETAIL__POWER_UNIT_EXT_RESOURCE_ID` (`CUSTOMER_ID`,`POWER_UNIT_EXTERNAL_RESOURCE_ID_FK`),
  CONSTRAINT `FK_NETWORK_ELEMENT_POWER_DETAIL__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_POWER_DETAIL__NE_TYPE_DETAIL_TABLE` FOREIGN KEY (`NETWORK_ELEMENT_TYPE`, `DETAIL_TABLE`) REFERENCES `NETWORK_ELEMENT_TYPE` (`CODE`, `DETAIL_TABLE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_POWER_DETAIL__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`, `NETWORK_ELEMENT_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `FK_NETWORK_ELEMENT_POWER_DETAIL__POWER_UNIT_EXTERNAL_RESOURCE` FOREIGN KEY (`CUSTOMER_ID`, `POWER_UNIT_EXTERNAL_RESOURCE_ID_FK`) REFERENCES `EXTERNAL_RESOURCE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_NETWORK_ELEMENT_POWER_DETAIL__DETAIL_TABLE` CHECK ((`DETAIL_TABLE` = _utf8mb4'NETWORK_ELEMENT_POWER_DETAIL')),
  CONSTRAINT `CK_NETWORK_ELEMENT_POWER_DETAIL__MONITORING_PROTOCOL_VALUES` CHECK ((`MONITORING_PROTOCOL` in (_utf8mb4'SNMP',_utf8mb4'MODBUS',_utf8mb4'REST',_utf8mb4'PROPRIETARY'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_POWER_DETAIL__NOMINAL_DC_VOLTAGE_NON_NEGATIVE` CHECK (((`NOMINAL_DC_VOLTAGE` is null) or (`NOMINAL_DC_VOLTAGE` >= 0))),
  CONSTRAINT `CK_NETWORK_ELEMENT_POWER_DETAIL__POWER_NODE_TYPE_VALUES` CHECK ((`POWER_NODE_TYPE` in (_utf8mb4'RECTIFIER_SYSTEM',_utf8mb4'SMART_PDU',_utf8mb4'UPS_CONTROLLER',_utf8mb4'SOLAR_CONTROLLER',_utf8mb4'GENSET_CONTROLLER',_utf8mb4'FUEL_SENSOR_UNIT',_utf8mb4'BATTERY_MONITOR'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_POWER_DETAIL__RATED_CAPACITY_KW_NON_NEGATIVE` CHECK (((`RATED_CAPACITY_KW` is null) or (`RATED_CAPACITY_KW` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Monitored power controller attributes (1:1 with NETWORK_ELEMENT; any domain, site facility). Power unit proxied from Passive Inventory. [v6, 2026-09-28]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_ELEMENT_POWER_DETAIL`
--

LOCK TABLES `NETWORK_ELEMENT_POWER_DETAIL` WRITE;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_POWER_DETAIL` DISABLE KEYS */;
INSERT INTO `NETWORK_ELEMENT_POWER_DETAIL` VALUES (1,1,8,'POWER_CONTROLLER','NETWORK_ELEMENT_POWER_DETAIL','RECTIFIER_SYSTEM',2,'SNMP',48.0,12.00,240,'2026-09-28 08:15:11.553',1,'2026-09-28 08:15:11.553',1,0);
/*!40000 ALTER TABLE `NETWORK_ELEMENT_POWER_DETAIL` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_ELEMENT_RAN_DETAIL`
--

DROP TABLE IF EXISTS `NETWORK_ELEMENT_RAN_DETAIL`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_ELEMENT_RAN_DETAIL` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1)',
  `NETWORK_ELEMENT_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE)',
  `DETAIL_TABLE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NETWORK_ELEMENT_RAN_DETAIL' COMMENT 'Constant NETWORK_ELEMENT_RAN_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted',
  `DEPLOYMENT_TYPE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'MACRO' COMMENT 'Deployment of the node. Values: MACRO, SMALL_CELL, INDOOR, DAS, REPEATER',
  `ARCHITECTURE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Deployment architecture. Values: INTEGRATED, SPLIT_CU_DU, CLOUD_RAN, OPEN_RAN',
  `NODE_ID` int unsigned DEFAULT NULL COMMENT 'BTS / NodeB id, eNB id (20 bit) or gNB id (22-32 bit) within the PLMN',
  `GNB_ID_LENGTH` tinyint unsigned DEFAULT NULL COMMENT 'gNB id bit length (22-32); only for GNODEB / GNB_CU / GNB_DU',
  `PRIMARY_PLMN_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK PLMN.ID: primary serving PLMN (shared PLMNs per cell are RADIO_CELL_PLMN)',
  `CONTROLLER_NETWORK_ELEMENT_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK NETWORK_ELEMENT.ID: controlling node (BSC for a BTS, RNC for a NodeB, gNB-CU for a gNB-DU)',
  `CONTROLLER_NETWORK_ELEMENT_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Copy of the controller NETWORK_ELEMENT_TYPE, FK-bound; must be BSC, RNC or GNB_CU',
  `CORE_POOL` varchar(64) DEFAULT NULL COMMENT 'MME / AMF pool the node is homed to',
  `SYNC_SOURCE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Timing source. Values: GPS, PTP, SYNC_E, NTP, NONE',
  `BACKHAUL_TYPE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Backhaul medium. Values: FIBER, MICROWAVE, IP_MPLS_VPN, LEASED_LINE, SATELLITE',
  `MAX_CELLS` smallint unsigned DEFAULT NULL COMMENT 'Licensed cell capacity of the node',
  `EMS_LIVE_DATE` date DEFAULT NULL COMMENT 'Date the node went live in the EMS',
  `PLATFORM_ON_AIR_DATE` date DEFAULT NULL COMMENT 'Date the platform (BBU / site) went on air',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_RAN_DETAIL__NETWORK_ELEMENT_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`NETWORK_ELEMENT_TYPE`),
  KEY `IDX_NETWORK_ELEMENT_RAN_DETAIL__NE_TYPE_DETAIL_TABLE` (`NETWORK_ELEMENT_TYPE`,`DETAIL_TABLE`),
  KEY `IDX_NETWORK_ELEMENT_RAN_DETAIL__PRIMARY_PLMN_ID` (`CUSTOMER_ID`,`PRIMARY_PLMN_ID_FK`),
  KEY `IDX_NETWORK_ELEMENT_RAN_DETAIL__CONTROLLER` (`CUSTOMER_ID`,`CONTROLLER_NETWORK_ELEMENT_ID_FK`,`CONTROLLER_NETWORK_ELEMENT_TYPE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_RAN_DETAIL__CONTROLLER` FOREIGN KEY (`CUSTOMER_ID`, `CONTROLLER_NETWORK_ELEMENT_ID_FK`, `CONTROLLER_NETWORK_ELEMENT_TYPE`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`, `NETWORK_ELEMENT_TYPE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_RAN_DETAIL__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_RAN_DETAIL__NE_TYPE_DETAIL_TABLE` FOREIGN KEY (`NETWORK_ELEMENT_TYPE`, `DETAIL_TABLE`) REFERENCES `NETWORK_ELEMENT_TYPE` (`CODE`, `DETAIL_TABLE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_RAN_DETAIL__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`, `NETWORK_ELEMENT_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `FK_NETWORK_ELEMENT_RAN_DETAIL__PRIMARY_PLMN_ID` FOREIGN KEY (`CUSTOMER_ID`, `PRIMARY_PLMN_ID_FK`) REFERENCES `PLMN` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_NETWORK_ELEMENT_RAN_DETAIL__ARCHITECTURE_VALUES` CHECK ((`ARCHITECTURE` in (_utf8mb4'INTEGRATED',_utf8mb4'SPLIT_CU_DU',_utf8mb4'CLOUD_RAN',_utf8mb4'OPEN_RAN'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_RAN_DETAIL__BACKHAUL_TYPE_VALUES` CHECK ((`BACKHAUL_TYPE` in (_utf8mb4'FIBER',_utf8mb4'MICROWAVE',_utf8mb4'IP_MPLS_VPN',_utf8mb4'LEASED_LINE',_utf8mb4'SATELLITE'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_RAN_DETAIL__CONTROLLER` CHECK ((((`CONTROLLER_NETWORK_ELEMENT_ID_FK` is null) = (`CONTROLLER_NETWORK_ELEMENT_TYPE` is null)) and ((`CONTROLLER_NETWORK_ELEMENT_TYPE` is null) or (`CONTROLLER_NETWORK_ELEMENT_TYPE` in (_utf8mb4'BSC',_utf8mb4'RNC',_utf8mb4'GNB_CU'))))),
  CONSTRAINT `CK_NETWORK_ELEMENT_RAN_DETAIL__DEPLOYMENT_TYPE_VALUES` CHECK ((`DEPLOYMENT_TYPE` in (_utf8mb4'MACRO',_utf8mb4'SMALL_CELL',_utf8mb4'INDOOR',_utf8mb4'DAS',_utf8mb4'REPEATER'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_RAN_DETAIL__DETAIL_TABLE` CHECK ((`DETAIL_TABLE` = _utf8mb4'NETWORK_ELEMENT_RAN_DETAIL')),
  CONSTRAINT `CK_NETWORK_ELEMENT_RAN_DETAIL__GNB_ID_LENGTH` CHECK (((`GNB_ID_LENGTH` is null) or ((`GNB_ID_LENGTH` between 22 and 32) and (`NETWORK_ELEMENT_TYPE` in (_utf8mb4'GNODEB',_utf8mb4'GNB_CU',_utf8mb4'GNB_DU'))))),
  CONSTRAINT `CK_NETWORK_ELEMENT_RAN_DETAIL__NOT_OWN_CONTROLLER` CHECK (((`CONTROLLER_NETWORK_ELEMENT_ID_FK` is null) or (`CONTROLLER_NETWORK_ELEMENT_ID_FK` <> `NETWORK_ELEMENT_ID_FK`))),
  CONSTRAINT `CK_NETWORK_ELEMENT_RAN_DETAIL__SYNC_SOURCE_VALUES` CHECK ((`SYNC_SOURCE` in (_utf8mb4'GPS',_utf8mb4'PTP',_utf8mb4'SYNC_E',_utf8mb4'NTP',_utf8mb4'NONE')))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='RAN node attributes for 2G / 3G / 4G / 5G nodes, controllers, BBUs and radio units (1:1 with NETWORK_ELEMENT). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_ELEMENT_RAN_DETAIL`
--

LOCK TABLES `NETWORK_ELEMENT_RAN_DETAIL` WRITE;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_RAN_DETAIL` DISABLE KEYS */;
INSERT INTO `NETWORK_ELEMENT_RAN_DETAIL` VALUES (1,1,4,'GNODEB','NETWORK_ELEMENT_RAN_DETAIL','MACRO','INTEGRATED',5560,24,1,NULL,NULL,'AMF-POOL-SOUTH','GPS','FIBER',12,'2024-05-10','2024-05-12','2026-09-28 08:15:11.547',1,'2026-09-28 08:15:11.547',1,0),(2,1,5,'RADIO_UNIT','NETWORK_ELEMENT_RAN_DETAIL','MACRO',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2024-05-10','2024-05-12','2026-09-28 08:15:11.547',1,'2026-09-28 08:15:11.547',1,0);
/*!40000 ALTER TABLE `NETWORK_ELEMENT_RAN_DETAIL` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_ELEMENT_SECURITY_DETAIL`
--

DROP TABLE IF EXISTS `NETWORK_ELEMENT_SECURITY_DETAIL`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_ELEMENT_SECURITY_DETAIL` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1)',
  `NETWORK_ELEMENT_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE)',
  `DETAIL_TABLE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NETWORK_ELEMENT_SECURITY_DETAIL' COMMENT 'Constant NETWORK_ELEMENT_SECURITY_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted',
  `SECURITY_ROLE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Security function. Values: FIREWALL, IDS, IPS, DDOS_SCRUBBER, VPN_CONCENTRATOR, WAF, NAC',
  `DEPLOYMENT_MODE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'INLINE' COMMENT 'How the appliance sits in the traffic path. Values: INLINE, TAP, ROUTED, TRANSPARENT',
  `THROUGHPUT_CAPACITY_GBPS` decimal(10,2) DEFAULT NULL COMMENT 'Rated inspection / forwarding throughput, Gbps',
  `MAX_CONCURRENT_SESSIONS` int unsigned DEFAULT NULL COMMENT 'Rated concurrent session capacity',
  `POLICY_RULE_COUNT` int unsigned DEFAULT NULL COMMENT 'Active policy rules, as reported at discovery',
  `ZONE_COUNT` smallint unsigned DEFAULT NULL COMMENT 'Security zones configured',
  `HIGH_AVAILABILITY_MODE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'STANDALONE' COMMENT 'Clustering mode. Values: STANDALONE, ACTIVE_PASSIVE, ACTIVE_ACTIVE',
  `HIGH_AVAILABILITY_PEER_NETWORK_ELEMENT_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK NETWORK_ELEMENT.ID: the paired appliance when HIGH_AVAILABILITY_MODE is not STANDALONE',
  `SIGNATURE_VERSION` varchar(50) DEFAULT NULL COMMENT 'Loaded IPS / anti-malware signature version',
  `LAST_SIGNATURE_UPDATE_TIME` datetime(3) DEFAULT NULL COMMENT 'When the signature database was last updated (UTC)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_SECURITY_DETAIL__NETWORK_ELEMENT_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`NETWORK_ELEMENT_TYPE`),
  KEY `IDX_NETWORK_ELEMENT_SECURITY_DETAIL__NE_TYPE_DETAIL_TABLE` (`NETWORK_ELEMENT_TYPE`,`DETAIL_TABLE`),
  KEY `IDX_NE_SECURITY_DETAIL__HIGH_AVAILABILITY_PEER_NE_ID` (`CUSTOMER_ID`,`HIGH_AVAILABILITY_PEER_NETWORK_ELEMENT_ID_FK`),
  CONSTRAINT `FK_NETWORK_ELEMENT_SECURITY_DETAIL__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_SECURITY_DETAIL__HIGH_AVAILABILITY_PEER_NE_ID` FOREIGN KEY (`CUSTOMER_ID`, `HIGH_AVAILABILITY_PEER_NETWORK_ELEMENT_ID_FK`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_SECURITY_DETAIL__NE_TYPE_DETAIL_TABLE` FOREIGN KEY (`NETWORK_ELEMENT_TYPE`, `DETAIL_TABLE`) REFERENCES `NETWORK_ELEMENT_TYPE` (`CODE`, `DETAIL_TABLE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_SECURITY_DETAIL__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`, `NETWORK_ELEMENT_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `CK_NE_SECURITY_DETAIL__THROUGHPUT_CAPACITY_GBPS_NON_NEGATIVE` CHECK (((`THROUGHPUT_CAPACITY_GBPS` is null) or (`THROUGHPUT_CAPACITY_GBPS` >= 0))),
  CONSTRAINT `CK_NETWORK_ELEMENT_SECURITY_DETAIL__DEPLOYMENT_MODE_VALUES` CHECK ((`DEPLOYMENT_MODE` in (_utf8mb4'INLINE',_utf8mb4'TAP',_utf8mb4'ROUTED',_utf8mb4'TRANSPARENT'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_SECURITY_DETAIL__DETAIL_TABLE` CHECK ((`DETAIL_TABLE` = _utf8mb4'NETWORK_ELEMENT_SECURITY_DETAIL')),
  CONSTRAINT `CK_NETWORK_ELEMENT_SECURITY_DETAIL__HA` CHECK ((((`HIGH_AVAILABILITY_MODE` = _utf8mb4'STANDALONE') = (`HIGH_AVAILABILITY_PEER_NETWORK_ELEMENT_ID_FK` is null)) and ((`HIGH_AVAILABILITY_PEER_NETWORK_ELEMENT_ID_FK` is null) or (`HIGH_AVAILABILITY_PEER_NETWORK_ELEMENT_ID_FK` <> `NETWORK_ELEMENT_ID_FK`)))),
  CONSTRAINT `CK_NETWORK_ELEMENT_SECURITY_DETAIL__HIGH_AVAILABILITY_MODE` CHECK ((`HIGH_AVAILABILITY_MODE` in (_utf8mb4'STANDALONE',_utf8mb4'ACTIVE_PASSIVE',_utf8mb4'ACTIVE_ACTIVE'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_SECURITY_DETAIL__SECURITY_ROLE_VALUES` CHECK ((`SECURITY_ROLE` in (_utf8mb4'FIREWALL',_utf8mb4'IDS',_utf8mb4'IPS',_utf8mb4'DDOS_SCRUBBER',_utf8mb4'VPN_CONCENTRATOR',_utf8mb4'WAF',_utf8mb4'NAC')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Security appliance attributes (1:1 with NETWORK_ELEMENT; Core / IP/MPLS domains). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_ELEMENT_SECURITY_DETAIL`
--

LOCK TABLES `NETWORK_ELEMENT_SECURITY_DETAIL` WRITE;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_SECURITY_DETAIL` DISABLE KEYS */;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_SECURITY_DETAIL` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_ELEMENT_SERVER_DETAIL`
--

DROP TABLE IF EXISTS `NETWORK_ELEMENT_SERVER_DETAIL`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_ELEMENT_SERVER_DETAIL` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1)',
  `NETWORK_ELEMENT_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE)',
  `DETAIL_TABLE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NETWORK_ELEMENT_SERVER_DETAIL' COMMENT 'Constant NETWORK_ELEMENT_SERVER_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted',
  `SERVER_ROLE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Role of the host. Values: COMPUTE, STORAGE, CONTROLLER, MANAGEMENT, BARE_METAL',
  `HYPERVISOR` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NONE' COMMENT 'Virtualisation platform on the host. Values: KVM, VMWARE, HYPERV, KUBERNETES, NONE',
  `CLOUD_CLUSTER_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK CLOUD_CLUSTER.ID: cluster the host is a member of',
  `CPU_SOCKETS` tinyint unsigned DEFAULT NULL COMMENT 'Populated CPU sockets',
  `CPU_CORES` smallint unsigned DEFAULT NULL COMMENT 'Physical CPU cores in total',
  `MEMORY_GB` smallint unsigned DEFAULT NULL COMMENT 'Installed memory, GB',
  `STORAGE_GB` int unsigned DEFAULT NULL COMMENT 'Local storage, GB',
  `GPU_COUNT` tinyint unsigned DEFAULT NULL COMMENT 'Installed accelerators',
  `OS_TYPE` varchar(32) DEFAULT NULL COMMENT 'Operating system family (the version is NETWORK_ELEMENT.OS_VERSION)',
  `BMC_IP` varchar(45) DEFAULT NULL COMMENT 'Out-of-band management (BMC / iDRAC / iLO) address',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_SERVER_DETAIL__NETWORK_ELEMENT_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`NETWORK_ELEMENT_TYPE`),
  KEY `IDX_NETWORK_ELEMENT_SERVER_DETAIL__NE_TYPE_DETAIL_TABLE` (`NETWORK_ELEMENT_TYPE`,`DETAIL_TABLE`),
  KEY `IDX_NETWORK_ELEMENT_SERVER_DETAIL__CLOUD_CLUSTER_ID` (`CUSTOMER_ID`,`CLOUD_CLUSTER_ID_FK`),
  CONSTRAINT `FK_NETWORK_ELEMENT_SERVER_DETAIL__CLOUD_CLUSTER_ID` FOREIGN KEY (`CUSTOMER_ID`, `CLOUD_CLUSTER_ID_FK`) REFERENCES `CLOUD_CLUSTER` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_SERVER_DETAIL__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_SERVER_DETAIL__NE_TYPE_DETAIL_TABLE` FOREIGN KEY (`NETWORK_ELEMENT_TYPE`, `DETAIL_TABLE`) REFERENCES `NETWORK_ELEMENT_TYPE` (`CODE`, `DETAIL_TABLE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_SERVER_DETAIL__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`, `NETWORK_ELEMENT_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `CK_NETWORK_ELEMENT_SERVER_DETAIL__BMC_IP` CHECK (((`BMC_IP` is null) or is_ipv4(`BMC_IP`) or is_ipv6(`BMC_IP`))),
  CONSTRAINT `CK_NETWORK_ELEMENT_SERVER_DETAIL__DETAIL_TABLE` CHECK ((`DETAIL_TABLE` = _utf8mb4'NETWORK_ELEMENT_SERVER_DETAIL')),
  CONSTRAINT `CK_NETWORK_ELEMENT_SERVER_DETAIL__HYPERVISOR_VALUES` CHECK ((`HYPERVISOR` in (_utf8mb4'KVM',_utf8mb4'VMWARE',_utf8mb4'HYPERV',_utf8mb4'KUBERNETES',_utf8mb4'NONE'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_SERVER_DETAIL__SERVER_ROLE_VALUES` CHECK ((`SERVER_ROLE` in (_utf8mb4'COMPUTE',_utf8mb4'STORAGE',_utf8mb4'CONTROLLER',_utf8mb4'MANAGEMENT',_utf8mb4'BARE_METAL')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Compute host capacity and platform attributes (1:1 with NETWORK_ELEMENT; Core / RAN domains). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_ELEMENT_SERVER_DETAIL`
--

LOCK TABLES `NETWORK_ELEMENT_SERVER_DETAIL` WRITE;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_SERVER_DETAIL` DISABLE KEYS */;
INSERT INTO `NETWORK_ELEMENT_SERVER_DETAIL` VALUES (1,1,6,'SERVER','NETWORK_ELEMENT_SERVER_DETAIL','COMPUTE','KUBERNETES',1,2,64,512,7680,0,'RHEL','10.30.0.11','2026-09-28 08:15:11.548',1,'2026-09-28 08:15:11.548',1,0);
/*!40000 ALTER TABLE `NETWORK_ELEMENT_SERVER_DETAIL` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_ELEMENT_STOCK_TRANSITION`
--

DROP TABLE IF EXISTS `NETWORK_ELEMENT_STOCK_TRANSITION`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_ELEMENT_STOCK_TRANSITION` (
  `ID` smallint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK (metadata table)',
  `FROM_STATE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'State the move starts from. Values: PLANNED, IN_STORE, IN_TRANSIT, DEPLOYED, FAULTY_RMA, DECOMMISSIONED',
  `TO_STATE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'State the move ends in. Values: PLANNED, IN_STORE, IN_TRANSIT, DEPLOYED, FAULTY_RMA, DECOMMISSIONED',
  `MOVEMENT_TYPE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Movement that performs the transition. Values: RECEIVE, ISSUE, DISPATCH, INSTALL, DE_INSTALL, RMA_OUT, RMA_IN, DECOMMISSION, RECOVER, SCRAP',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_STOCK_TRANSITION__FROM_STATE_TO_STATE` (`FROM_STATE`,`TO_STATE`),
  CONSTRAINT `CK_NETWORK_ELEMENT_STOCK_TRANSITION__FROM_STATE_VALUES` CHECK ((`FROM_STATE` in (_utf8mb4'PLANNED',_utf8mb4'IN_STORE',_utf8mb4'IN_TRANSIT',_utf8mb4'DEPLOYED',_utf8mb4'FAULTY_RMA',_utf8mb4'DECOMMISSIONED'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_STOCK_TRANSITION__MOVEMENT_TYPE_VALUES` CHECK ((`MOVEMENT_TYPE` in (_utf8mb4'RECEIVE',_utf8mb4'ISSUE',_utf8mb4'DISPATCH',_utf8mb4'INSTALL',_utf8mb4'DE_INSTALL',_utf8mb4'RMA_OUT',_utf8mb4'RMA_IN',_utf8mb4'DECOMMISSION',_utf8mb4'RECOVER',_utf8mb4'SCRAP'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_STOCK_TRANSITION__TO_STATE_VALUES` CHECK ((`TO_STATE` in (_utf8mb4'PLANNED',_utf8mb4'IN_STORE',_utf8mb4'IN_TRANSIT',_utf8mb4'DEPLOYED',_utf8mb4'FAULTY_RMA',_utf8mb4'DECOMMISSIONED')))
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Allowed stock-state moves (planned > in store > deployed > faulty / RMA > decommissioned; decommissioned > in store = recovered to store). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_ELEMENT_STOCK_TRANSITION`
--

LOCK TABLES `NETWORK_ELEMENT_STOCK_TRANSITION` WRITE;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_STOCK_TRANSITION` DISABLE KEYS */;
INSERT INTO `NETWORK_ELEMENT_STOCK_TRANSITION` VALUES (1,'PLANNED','IN_STORE','RECEIVE'),(2,'PLANNED','IN_TRANSIT','DISPATCH'),(3,'PLANNED','DEPLOYED','INSTALL'),(4,'IN_STORE','IN_TRANSIT','ISSUE'),(5,'IN_TRANSIT','IN_STORE','RECEIVE'),(6,'IN_TRANSIT','DEPLOYED','INSTALL'),(7,'IN_STORE','DEPLOYED','INSTALL'),(8,'DEPLOYED','IN_STORE','DE_INSTALL'),(9,'DEPLOYED','FAULTY_RMA','RMA_OUT'),(10,'FAULTY_RMA','IN_STORE','RMA_IN'),(11,'DEPLOYED','DECOMMISSIONED','DECOMMISSION'),(12,'IN_STORE','DECOMMISSIONED','SCRAP'),(13,'FAULTY_RMA','DECOMMISSIONED','SCRAP'),(14,'DECOMMISSIONED','IN_STORE','RECOVER');
/*!40000 ALTER TABLE `NETWORK_ELEMENT_STOCK_TRANSITION` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_ELEMENT_SWITCH_DETAIL`
--

DROP TABLE IF EXISTS `NETWORK_ELEMENT_SWITCH_DETAIL`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_ELEMENT_SWITCH_DETAIL` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1)',
  `NETWORK_ELEMENT_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE)',
  `DETAIL_TABLE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NETWORK_ELEMENT_SWITCH_DETAIL' COMMENT 'Constant NETWORK_ELEMENT_SWITCH_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted',
  `SWITCH_ROLE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Role in the switched network. Values: ACCESS, DISTRIBUTION, CORE, TOP_OF_RACK, AGGREGATION',
  `SWITCH_LAYER` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'L2' COMMENT 'Forwarding layer. Values: L2, L3',
  `STP_MODE` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Spanning-tree flavour. Values: STP, RSTP, MSTP, PVST, NONE',
  `STACK_ROLE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'STANDALONE' COMMENT 'Stacking role. Values: STANDALONE, MASTER, MEMBER',
  `STACK_ID` varchar(32) DEFAULT NULL COMMENT 'Stack / virtual-chassis identifier when stacked',
  `STACK_MEMBER_COUNT` tinyint unsigned DEFAULT NULL COMMENT 'Members in the stack (on the master)',
  `MANAGEMENT_VLAN_ID` smallint unsigned DEFAULT NULL COMMENT 'Management VLAN id (1-4094)',
  `POE_BUDGET_W` smallint unsigned DEFAULT NULL COMMENT 'Total PoE budget, watts',
  `UPLINK_CAPACITY_GBPS` decimal(8,2) DEFAULT NULL COMMENT 'Aggregate uplink capacity, Gbps',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_SWITCH_DETAIL__NETWORK_ELEMENT_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`NETWORK_ELEMENT_TYPE`),
  KEY `IDX_NETWORK_ELEMENT_SWITCH_DETAIL__NE_TYPE_DETAIL_TABLE` (`NETWORK_ELEMENT_TYPE`,`DETAIL_TABLE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_SWITCH_DETAIL__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_SWITCH_DETAIL__NE_TYPE_DETAIL_TABLE` FOREIGN KEY (`NETWORK_ELEMENT_TYPE`, `DETAIL_TABLE`) REFERENCES `NETWORK_ELEMENT_TYPE` (`CODE`, `DETAIL_TABLE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_SWITCH_DETAIL__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`, `NETWORK_ELEMENT_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `CK_NE_SWITCH_DETAIL__UPLINK_CAPACITY_GBPS_NON_NEGATIVE` CHECK (((`UPLINK_CAPACITY_GBPS` is null) or (`UPLINK_CAPACITY_GBPS` >= 0))),
  CONSTRAINT `CK_NETWORK_ELEMENT_SWITCH_DETAIL__DETAIL_TABLE` CHECK ((`DETAIL_TABLE` = _utf8mb4'NETWORK_ELEMENT_SWITCH_DETAIL')),
  CONSTRAINT `CK_NETWORK_ELEMENT_SWITCH_DETAIL__MGMT_VLAN` CHECK (((`MANAGEMENT_VLAN_ID` is null) or (`MANAGEMENT_VLAN_ID` between 1 and 4094))),
  CONSTRAINT `CK_NETWORK_ELEMENT_SWITCH_DETAIL__STACK` CHECK (((`STACK_ROLE` = _utf8mb4'STANDALONE') = (`STACK_ID` is null))),
  CONSTRAINT `CK_NETWORK_ELEMENT_SWITCH_DETAIL__STACK_ROLE_VALUES` CHECK ((`STACK_ROLE` in (_utf8mb4'STANDALONE',_utf8mb4'MASTER',_utf8mb4'MEMBER'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_SWITCH_DETAIL__STP_MODE_VALUES` CHECK ((`STP_MODE` in (_utf8mb4'STP',_utf8mb4'RSTP',_utf8mb4'MSTP',_utf8mb4'PVST',_utf8mb4'NONE'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_SWITCH_DETAIL__SWITCH_LAYER_VALUES` CHECK ((`SWITCH_LAYER` in (_utf8mb4'L2',_utf8mb4'L3'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_SWITCH_DETAIL__SWITCH_ROLE_VALUES` CHECK ((`SWITCH_ROLE` in (_utf8mb4'ACCESS',_utf8mb4'DISTRIBUTION',_utf8mb4'CORE',_utf8mb4'TOP_OF_RACK',_utf8mb4'AGGREGATION')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Switch role, spanning tree and stacking attributes (1:1 with NETWORK_ELEMENT; Transport / IP/MPLS / Core domains). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_ELEMENT_SWITCH_DETAIL`
--

LOCK TABLES `NETWORK_ELEMENT_SWITCH_DETAIL` WRITE;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_SWITCH_DETAIL` DISABLE KEYS */;
INSERT INTO `NETWORK_ELEMENT_SWITCH_DETAIL` VALUES (1,1,2,'SWITCH','NETWORK_ELEMENT_SWITCH_DETAIL','ACCESS','L2','RSTP','STANDALONE',NULL,NULL,100,0,200.00,'2026-09-28 08:15:11.545',1,'2026-09-28 08:15:11.545',1,0);
/*!40000 ALTER TABLE `NETWORK_ELEMENT_SWITCH_DETAIL` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_ELEMENT_TYPE`
--

DROP TABLE IF EXISTS `NETWORK_ELEMENT_TYPE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_ELEMENT_TYPE` (
  `ID` smallint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK (catalog)',
  `CODE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Type code, the value NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE carries',
  `NAME` varchar(50) NOT NULL COMMENT 'Display name',
  `DETAIL_TABLE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'The one NE_*_DETAIL table for this type; NULL = none. Values: NETWORK_ELEMENT_RAN_DETAIL,NETWORK_ELEMENT_CORE_DETAIL,NETWORK_ELEMENT_IP_MPLS_DETAIL,NETWORK_ELEMENT_SWITCH_DETAIL,NETWORK_ELEMENT_SERVER_DETAIL,NETWORK_ELEMENT_OPTICAL_DETAIL,NETWORK_ELEMENT_MICROWAVE_DETAIL,NETWORK_ELEMENT_PON_DETAIL,NETWORK_ELEMENT_WIFI_DETAIL,NETWORK_ELEMENT_SECURITY_DETAIL,NETWORK_ELEMENT_POWER_DETAIL',
  `CAN_BE_VIRTUAL` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 when devices of this type may be virtual (VNF / CNF), e.g. CORE_NF, GNB_CU, GNB_DU, ROUTER',
  `SORT_ORDER` tinyint unsigned NOT NULL COMMENT 'Display order of the types',
  `IS_ACTIVE` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1 when selectable for new records',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_TYPE__CODE` (`CODE`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_TYPE__SORT_ORDER` (`SORT_ORDER`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_TYPE__CODE_DETAIL_TABLE` (`CODE`,`DETAIL_TABLE`),
  CONSTRAINT `CK_NETWORK_ELEMENT_TYPE__DETAIL_TABLE_VALUES` CHECK ((`DETAIL_TABLE` in (_utf8mb4'NETWORK_ELEMENT_RAN_DETAIL',_utf8mb4'NETWORK_ELEMENT_CORE_DETAIL',_utf8mb4'NETWORK_ELEMENT_IP_MPLS_DETAIL',_utf8mb4'NETWORK_ELEMENT_SWITCH_DETAIL',_utf8mb4'NETWORK_ELEMENT_SERVER_DETAIL',_utf8mb4'NETWORK_ELEMENT_OPTICAL_DETAIL',_utf8mb4'NETWORK_ELEMENT_MICROWAVE_DETAIL',_utf8mb4'NETWORK_ELEMENT_PON_DETAIL',_utf8mb4'NETWORK_ELEMENT_WIFI_DETAIL',_utf8mb4'NETWORK_ELEMENT_SECURITY_DETAIL',_utf8mb4'NETWORK_ELEMENT_POWER_DETAIL')))
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Device-type catalog: tab, the one detail table of the type, and whether it may be virtual. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_ELEMENT_TYPE`
--

LOCK TABLES `NETWORK_ELEMENT_TYPE` WRITE;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_TYPE` DISABLE KEYS */;
INSERT INTO `NETWORK_ELEMENT_TYPE` VALUES (1,'ROUTER','Router','NETWORK_ELEMENT_IP_MPLS_DETAIL',1,1,1),(2,'SWITCH','Switch','NETWORK_ELEMENT_SWITCH_DETAIL',1,2,1),(3,'FIREWALL','Firewall','NETWORK_ELEMENT_SECURITY_DETAIL',1,3,1),(4,'SECURITY_APPLIANCE','Security appliance','NETWORK_ELEMENT_SECURITY_DETAIL',1,4,1),(5,'SERVER','Server','NETWORK_ELEMENT_SERVER_DETAIL',0,5,1),(6,'OPTICAL','Optical node (DWDM / OTN / ROADM)','NETWORK_ELEMENT_OPTICAL_DETAIL',0,6,1),(7,'MICROWAVE','Microwave terminal','NETWORK_ELEMENT_MICROWAVE_DETAIL',0,7,1),(8,'OLT','OLT','NETWORK_ELEMENT_PON_DETAIL',0,8,1),(9,'ONU','ONU','NETWORK_ELEMENT_PON_DETAIL',0,9,1),(10,'ONT','ONT','NETWORK_ELEMENT_PON_DETAIL',0,10,1),(11,'WIFI_AP','Wi-Fi access point','NETWORK_ELEMENT_WIFI_DETAIL',0,11,1),(12,'WLAN_CONTROLLER','WLAN controller','NETWORK_ELEMENT_WIFI_DETAIL',1,12,1),(13,'BTS','BTS (2G)','NETWORK_ELEMENT_RAN_DETAIL',0,13,1),(14,'BSC','BSC (2G)','NETWORK_ELEMENT_RAN_DETAIL',1,14,1),(15,'NODEB','NodeB (3G)','NETWORK_ELEMENT_RAN_DETAIL',0,15,1),(16,'RNC','RNC (3G)','NETWORK_ELEMENT_RAN_DETAIL',1,16,1),(17,'ENODEB','eNodeB (4G)','NETWORK_ELEMENT_RAN_DETAIL',0,17,1),(18,'GNODEB','gNodeB (5G)','NETWORK_ELEMENT_RAN_DETAIL',1,18,1),(19,'GNB_CU','gNB-CU (5G)','NETWORK_ELEMENT_RAN_DETAIL',1,19,1),(20,'GNB_DU','gNB-DU (5G)','NETWORK_ELEMENT_RAN_DETAIL',1,20,1),(21,'BBU','Baseband unit','NETWORK_ELEMENT_RAN_DETAIL',0,21,1),(22,'RADIO_UNIT','Radio unit (RRU / RRH / AAU)','NETWORK_ELEMENT_RAN_DETAIL',0,22,1),(23,'CORE_NF','Core / IMS network function','NETWORK_ELEMENT_CORE_DETAIL',1,23,1),(24,'POWER_CONTROLLER','Power controller / rectifier','NETWORK_ELEMENT_POWER_DETAIL',0,24,1),(25,'OTHER','Other',NULL,1,25,1);
/*!40000 ALTER TABLE `NETWORK_ELEMENT_TYPE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_ELEMENT_TYPE_DOMAIN`
--

DROP TABLE IF EXISTS `NETWORK_ELEMENT_TYPE_DOMAIN`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_ELEMENT_TYPE_DOMAIN` (
  `ID` smallint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK (metadata table)',
  `NETWORK_ELEMENT_TYPE_CODE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'FK NETWORK_ELEMENT_TYPE.CODE',
  `DOMAIN_ID_FK` smallint unsigned NOT NULL COMMENT 'FK DOMAIN.ID: a domain this type may be filed under (a child domain such as IP/MPLS is listed explicitly)',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_TYPE_DOMAIN__NE_TYPE_CODE_DOMAIN_ID` (`NETWORK_ELEMENT_TYPE_CODE`,`DOMAIN_ID_FK`),
  KEY `IDX_NETWORK_ELEMENT_TYPE_DOMAIN__DOMAIN_ID` (`DOMAIN_ID_FK`),
  CONSTRAINT `FK_NETWORK_ELEMENT_TYPE_DOMAIN__DOMAIN_ID` FOREIGN KEY (`DOMAIN_ID_FK`) REFERENCES `DOMAIN` (`ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_TYPE_DOMAIN__NETWORK_ELEMENT_TYPE_CODE` FOREIGN KEY (`NETWORK_ELEMENT_TYPE_CODE`) REFERENCES `NETWORK_ELEMENT_TYPE` (`CODE`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Allowed (device type, network domain) pairs; the FK target that keeps every device in a domain its type covers. Seeded; global. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_ELEMENT_TYPE_DOMAIN`
--

LOCK TABLES `NETWORK_ELEMENT_TYPE_DOMAIN` WRITE;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_TYPE_DOMAIN` DISABLE KEYS */;
INSERT INTO `NETWORK_ELEMENT_TYPE_DOMAIN` VALUES (9,'BBU',1),(2,'BSC',1),(1,'BTS',1),(15,'CORE_NF',2),(5,'ENODEB',1),(19,'FIREWALL',2),(26,'FIREWALL',3),(30,'FIREWALL',4),(44,'FIREWALL',8),(7,'GNB_CU',1),(8,'GNB_DU',1),(6,'GNODEB',1),(25,'MICROWAVE',3),(33,'MICROWAVE',6),(3,'NODEB',1),(34,'OLT',7),(36,'ONT',7),(35,'ONU',7),(24,'OPTICAL',3),(32,'OPTICAL',5),(14,'OTHER',1),(21,'OTHER',2),(27,'OTHER',3),(46,'OTHER',8),(48,'OTHER',9),(13,'POWER_CONTROLLER',1),(47,'POWER_CONTROLLER',9),(10,'RADIO_UNIT',1),(4,'RNC',1),(11,'ROUTER',1),(17,'ROUTER',2),(22,'ROUTER',3),(28,'ROUTER',4),(40,'ROUTER',7),(43,'ROUTER',8),(20,'SECURITY_APPLIANCE',2),(31,'SECURITY_APPLIANCE',4),(45,'SECURITY_APPLIANCE',8),(16,'SERVER',2),(41,'SERVER',8),(12,'SWITCH',1),(18,'SWITCH',2),(23,'SWITCH',3),(29,'SWITCH',4),(39,'SWITCH',7),(42,'SWITCH',8),(37,'WIFI_AP',7),(38,'WLAN_CONTROLLER',7);
/*!40000 ALTER TABLE `NETWORK_ELEMENT_TYPE_DOMAIN` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_ELEMENT_VIRTUAL_INSTANCE`
--

DROP TABLE IF EXISTS `NETWORK_ELEMENT_VIRTUAL_INSTANCE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_ELEMENT_VIRTUAL_INSTANCE` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID: the virtual NE (1:1)',
  `NETWORK_ELEMENT_RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'VIRTUAL_NE' COMMENT 'Constant VIRTUAL_NE: FK-binds this row to a virtual NE only',
  `VIRTUALIZATION_TYPE` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'VM-based or container-based. Values: VNF, CNF',
  `INSTANCE_UUID` char(36) DEFAULT NULL COMMENT 'Orchestrator instance UUID',
  `DESCRIPTOR_ID` varchar(64) DEFAULT NULL COMMENT 'VNFD / CNF package id',
  `DESCRIPTOR_VERSION` varchar(32) DEFAULT NULL COMMENT 'Descriptor / package version',
  `CLOUD_CLUSTER_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK CLOUD_CLUSTER.ID: hosting cluster / subcloud',
  `HOST_NETWORK_ELEMENT_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK NETWORK_ELEMENT.ID: physical server pinned as host (VNF on a known host)',
  `HOST_RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'PHYSICAL_NE' COMMENT 'Constant PHYSICAL_NE: the host must be a physical NE',
  `INSTANTIATION_STATE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NOT_INSTANTIATED' COMMENT 'Lifecycle as reported by the orchestrator. Values: NOT_INSTANTIATED, INSTANTIATED, TERMINATED',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_VIRTUAL_INSTANCE__NETWORK_ELEMENT_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`NETWORK_ELEMENT_RESOURCE_TYPE`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_VIRTUAL_INSTANCE__INSTANCE_UUID` (`CUSTOMER_ID`,`INSTANCE_UUID`),
  KEY `IDX_NETWORK_ELEMENT_VIRTUAL_INSTANCE__CLOUD_CLUSTER_ID` (`CUSTOMER_ID`,`CLOUD_CLUSTER_ID_FK`),
  KEY `IDX_NETWORK_ELEMENT_VIRTUAL_INSTANCE__HOST_NETWORK_ELEMENT_ID` (`CUSTOMER_ID`,`HOST_NETWORK_ELEMENT_ID_FK`,`HOST_RESOURCE_TYPE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_VIRTUAL_INSTANCE__CLOUD_CLUSTER_ID` FOREIGN KEY (`CUSTOMER_ID`, `CLOUD_CLUSTER_ID_FK`) REFERENCES `CLOUD_CLUSTER` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_VIRTUAL_INSTANCE__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_VIRTUAL_INSTANCE__HOST_NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `HOST_NETWORK_ELEMENT_ID_FK`, `HOST_RESOURCE_TYPE`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_VIRTUAL_INSTANCE__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_RESOURCE_TYPE`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `CK_NETWORK_ELEMENT_VIRTUAL_INSTANCE__INSTANTIATION_STATE_VALUES` CHECK ((`INSTANTIATION_STATE` in (_utf8mb4'NOT_INSTANTIATED',_utf8mb4'INSTANTIATED',_utf8mb4'TERMINATED'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_VIRTUAL_INSTANCE__PLACED` CHECK (((`INSTANTIATION_STATE` <> _utf8mb4'INSTANTIATED') or (`CLOUD_CLUSTER_ID_FK` is not null) or (`HOST_NETWORK_ELEMENT_ID_FK` is not null))),
  CONSTRAINT `CK_NETWORK_ELEMENT_VIRTUAL_INSTANCE__TYPES` CHECK (((`NETWORK_ELEMENT_RESOURCE_TYPE` = _utf8mb4'VIRTUAL_NE') and (`HOST_RESOURCE_TYPE` = _utf8mb4'PHYSICAL_NE'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_VIRTUAL_INSTANCE__UUID` CHECK (((`INSTANCE_UUID` is null) or regexp_like(`INSTANCE_UUID`,_utf8mb4'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',_utf8mb4'c'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_VIRTUAL_INSTANCE__VIRTUALIZATION_TYPE_VALUES` CHECK ((`VIRTUALIZATION_TYPE` in (_utf8mb4'VNF',_utf8mb4'CNF')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Virtualisation record (VNF / CNF) of a virtual NE, 1:1. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_ELEMENT_VIRTUAL_INSTANCE`
--

LOCK TABLES `NETWORK_ELEMENT_VIRTUAL_INSTANCE` WRITE;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_VIRTUAL_INSTANCE` DISABLE KEYS */;
INSERT INTO `NETWORK_ELEMENT_VIRTUAL_INSTANCE` VALUES (1,1,7,'VIRTUAL_NE','CNF','4f7c1d2e-8a9b-4c3d-9e0f-112233445566','nokia-cmm-amf','24.3.0',1,6,'PHYSICAL_NE','INSTANTIATED','2026-09-28 08:15:11.552',1,'2026-09-28 08:15:11.552',1,0);
/*!40000 ALTER TABLE `NETWORK_ELEMENT_VIRTUAL_INSTANCE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_ELEMENT_WIFI_DETAIL`
--

DROP TABLE IF EXISTS `NETWORK_ELEMENT_WIFI_DETAIL`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_ELEMENT_WIFI_DETAIL` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID: the device this detail row extends (1:1)',
  `NETWORK_ELEMENT_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Copy of NETWORK_ELEMENT.NETWORK_ELEMENT_TYPE; FK-bound to the device and to NETWORK_ELEMENT_TYPE (CODE, DETAIL_TABLE)',
  `DETAIL_TABLE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NETWORK_ELEMENT_WIFI_DETAIL' COMMENT 'Constant NETWORK_ELEMENT_WIFI_DETAIL: only types whose NETWORK_ELEMENT_TYPE.DETAIL_TABLE names this table are accepted',
  `WLAN_CONTROLLER_NETWORK_ELEMENT_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK NETWORK_ELEMENT.ID: the WLAN controller managing this AP; NULL on a controller or an autonomous AP',
  `ACCESS_POINT_GROUP` varchar(64) DEFAULT NULL COMMENT 'AP group / site tag on the controller',
  `ACCESS_POINT_MODE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'LOCAL' COMMENT 'Operating mode of an AP. Values: LOCAL, FLEXCONNECT, MESH, MONITOR, SNIFFER',
  `MESH_ROLE` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NONE' COMMENT 'Role in a mesh. Values: ROOT, MESH_AP, NONE',
  `PRIMARY_SSID` varchar(32) DEFAULT NULL COMMENT 'Primary SSID broadcast (802.11 limit 32 bytes)',
  `SSID_VLAN_ID` smallint unsigned DEFAULT NULL COMMENT 'VLAN id mapped to the primary SSID (1-4094)',
  `WIFI_STANDARD` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Highest standard supported. Values: 802_11N, 802_11AC, 802_11AX, 802_11BE',
  `RADIO_BANDS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Radio bands in use. Values: 2_4GHZ, 5GHZ, 6GHZ, DUAL_BAND, TRI_BAND',
  `CHANNEL` tinyint unsigned DEFAULT NULL COMMENT 'Configured channel number (6 GHz channels go up to 233)',
  `CHANNEL_WIDTH_MHZ` smallint unsigned DEFAULT NULL COMMENT 'Channel width, MHz (20, 40, 80, 160, 320)',
  `TRANSMIT_POWER_DBM` decimal(5,2) DEFAULT NULL COMMENT 'Configured transmit power, dBm',
  `SECURITY_MODE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'WPA2_ENTERPRISE' COMMENT 'Wireless security. Values: OPEN, WEP, WPA2_PSK, WPA2_ENTERPRISE, WPA3_PSK, WPA3_ENTERPRISE',
  `AUTHENTICATION_TYPE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'RADIUS' COMMENT 'Client authentication. Values: RADIUS, PSK, 802_1X, MAC_FILTER, NONE',
  `POE_LEVEL` tinyint unsigned DEFAULT NULL COMMENT 'IEEE 802.3 PoE type supplied (0-8)',
  `MAX_CLIENTS` smallint unsigned DEFAULT NULL COMMENT 'Client association limit',
  `COVERAGE_RADIUS_M` decimal(6,2) DEFAULT NULL COMMENT 'Designed coverage radius, metres',
  `MOUNTING_TYPE` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Mounting. Values: CEILING, WALL, POLE, DESK',
  `DEPLOYMENT_TYPE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'ENTERPRISE' COMMENT 'Deployment context. Values: INDOOR, OUTDOOR, PUBLIC_HOTSPOT, ENTERPRISE',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_ELEMENT_WIFI_DETAIL__NETWORK_ELEMENT_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`NETWORK_ELEMENT_TYPE`),
  KEY `IDX_NETWORK_ELEMENT_WIFI_DETAIL__NE_TYPE_DETAIL_TABLE` (`NETWORK_ELEMENT_TYPE`,`DETAIL_TABLE`),
  KEY `IDX_NETWORK_ELEMENT_WIFI_DETAIL__WLAN_CONTROLLER_NE_ID` (`CUSTOMER_ID`,`WLAN_CONTROLLER_NETWORK_ELEMENT_ID_FK`),
  CONSTRAINT `FK_NETWORK_ELEMENT_WIFI_DETAIL__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_NETWORK_ELEMENT_WIFI_DETAIL__NE_TYPE_DETAIL_TABLE` FOREIGN KEY (`NETWORK_ELEMENT_TYPE`, `DETAIL_TABLE`) REFERENCES `NETWORK_ELEMENT_TYPE` (`CODE`, `DETAIL_TABLE`),
  CONSTRAINT `FK_NETWORK_ELEMENT_WIFI_DETAIL__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NETWORK_ELEMENT_TYPE`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`, `NETWORK_ELEMENT_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `FK_NETWORK_ELEMENT_WIFI_DETAIL__WLAN_CONTROLLER_NE_ID` FOREIGN KEY (`CUSTOMER_ID`, `WLAN_CONTROLLER_NETWORK_ELEMENT_ID_FK`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_NETWORK_ELEMENT_WIFI_DETAIL__ACCESS_POINT_MODE_VALUES` CHECK ((`ACCESS_POINT_MODE` in (_utf8mb4'LOCAL',_utf8mb4'FLEXCONNECT',_utf8mb4'MESH',_utf8mb4'MONITOR',_utf8mb4'SNIFFER'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_WIFI_DETAIL__AUTHENTICATION_TYPE_VALUES` CHECK ((`AUTHENTICATION_TYPE` in (_utf8mb4'RADIUS',_utf8mb4'PSK',_utf8mb4'802_1X',_utf8mb4'MAC_FILTER',_utf8mb4'NONE'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_WIFI_DETAIL__CONTROLLER` CHECK (((`NETWORK_ELEMENT_TYPE` <> _utf8mb4'WLAN_CONTROLLER') or (`WLAN_CONTROLLER_NETWORK_ELEMENT_ID_FK` is null))),
  CONSTRAINT `CK_NETWORK_ELEMENT_WIFI_DETAIL__COVERAGE_RADIUS_M_NON_NEGATIVE` CHECK (((`COVERAGE_RADIUS_M` is null) or (`COVERAGE_RADIUS_M` >= 0))),
  CONSTRAINT `CK_NETWORK_ELEMENT_WIFI_DETAIL__DEPLOYMENT_TYPE_VALUES` CHECK ((`DEPLOYMENT_TYPE` in (_utf8mb4'INDOOR',_utf8mb4'OUTDOOR',_utf8mb4'PUBLIC_HOTSPOT',_utf8mb4'ENTERPRISE'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_WIFI_DETAIL__DETAIL_TABLE` CHECK ((`DETAIL_TABLE` = _utf8mb4'NETWORK_ELEMENT_WIFI_DETAIL')),
  CONSTRAINT `CK_NETWORK_ELEMENT_WIFI_DETAIL__MESH_ROLE_VALUES` CHECK ((`MESH_ROLE` in (_utf8mb4'ROOT',_utf8mb4'MESH_AP',_utf8mb4'NONE'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_WIFI_DETAIL__MOUNTING_TYPE_VALUES` CHECK ((`MOUNTING_TYPE` in (_utf8mb4'CEILING',_utf8mb4'WALL',_utf8mb4'POLE',_utf8mb4'DESK'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_WIFI_DETAIL__RADIO` CHECK ((((`SSID_VLAN_ID` is null) or (`SSID_VLAN_ID` between 1 and 4094)) and ((`CHANNEL_WIDTH_MHZ` is null) or (`CHANNEL_WIDTH_MHZ` in (20,40,80,160,320))) and ((`POE_LEVEL` is null) or (`POE_LEVEL` <= 8)))),
  CONSTRAINT `CK_NETWORK_ELEMENT_WIFI_DETAIL__RADIO_BANDS_VALUES` CHECK ((`RADIO_BANDS` in (_utf8mb4'2_4GHZ',_utf8mb4'5GHZ',_utf8mb4'6GHZ',_utf8mb4'DUAL_BAND',_utf8mb4'TRI_BAND'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_WIFI_DETAIL__SECURITY_MODE_VALUES` CHECK ((`SECURITY_MODE` in (_utf8mb4'OPEN',_utf8mb4'WEP',_utf8mb4'WPA2_PSK',_utf8mb4'WPA2_ENTERPRISE',_utf8mb4'WPA3_PSK',_utf8mb4'WPA3_ENTERPRISE'))),
  CONSTRAINT `CK_NETWORK_ELEMENT_WIFI_DETAIL__WIFI_STANDARD_VALUES` CHECK ((`WIFI_STANDARD` in (_utf8mb4'802_11N',_utf8mb4'802_11AC',_utf8mb4'802_11AX',_utf8mb4'802_11BE')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='WiFi access point / WLAN controller attributes (1:1 with NETWORK_ELEMENT; RAN domain, access radio). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_ELEMENT_WIFI_DETAIL`
--

LOCK TABLES `NETWORK_ELEMENT_WIFI_DETAIL` WRITE;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_WIFI_DETAIL` DISABLE KEYS */;
/*!40000 ALTER TABLE `NETWORK_ELEMENT_WIFI_DETAIL` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_FUNCTION_TYPE`
--

DROP TABLE IF EXISTS `NETWORK_FUNCTION_TYPE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_FUNCTION_TYPE` (
  `ID` smallint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK (catalog)',
  `CODE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'NF code (AMF, UPF, P_CSCF, SEPP ...)',
  `NAME` varchar(80) NOT NULL COMMENT 'Display name (Access and Mobility Management Function)',
  `CORE_SEGMENT` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Segment the NF belongs to. Values: EPC, 5GC, IMS, CS_CORE, COMMON',
  `DOMAIN_ID_FK` smallint unsigned NOT NULL COMMENT 'FK DOMAIN.ID: network domain (Core)',
  `IS_ACTIVE` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1 when selectable for new records',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_FUNCTION_TYPE__CODE` (`CODE`),
  KEY `IDX_NETWORK_FUNCTION_TYPE__DOMAIN_ID` (`DOMAIN_ID_FK`),
  CONSTRAINT `FK_NETWORK_FUNCTION_TYPE__DOMAIN_ID` FOREIGN KEY (`DOMAIN_ID_FK`) REFERENCES `DOMAIN` (`ID`),
  CONSTRAINT `CK_NETWORK_FUNCTION_TYPE__CORE_SEGMENT_VALUES` CHECK ((`CORE_SEGMENT` in (_utf8mb4'EPC',_utf8mb4'5GC',_utf8mb4'IMS',_utf8mb4'CS_CORE',_utf8mb4'COMMON')))
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Core / IMS / CS network-function type catalog. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_FUNCTION_TYPE`
--

LOCK TABLES `NETWORK_FUNCTION_TYPE` WRITE;
/*!40000 ALTER TABLE `NETWORK_FUNCTION_TYPE` DISABLE KEYS */;
INSERT INTO `NETWORK_FUNCTION_TYPE` VALUES (1,'MSC','Mobile Switching Centre','CS_CORE',2,1),(2,'HLR','Home Location Register','CS_CORE',2,1),(3,'SGSN','Serving GPRS Support Node','CS_CORE',2,1),(4,'GGSN','Gateway GPRS Support Node','CS_CORE',2,1),(5,'MME','Mobility Management Entity','EPC',2,1),(6,'SGW','Serving Gateway','EPC',2,1),(7,'PGW','PDN Gateway','EPC',2,1),(8,'HSS','Home Subscriber Server','EPC',2,1),(9,'PCRF','Policy and Charging Rules Function','EPC',2,1),(10,'AMF','Access and Mobility Management Function','5GC',2,1),(11,'SMF','Session Management Function','5GC',2,1),(12,'UPF','User Plane Function','5GC',2,1),(13,'AUSF','Authentication Server Function','5GC',2,1),(14,'UDM','Unified Data Management','5GC',2,1),(15,'UDR','Unified Data Repository','5GC',2,1),(16,'PCF','Policy Control Function','5GC',2,1),(17,'NRF','Network Repository Function','5GC',2,1),(18,'NSSF','Network Slice Selection Function','5GC',2,1),(19,'NEF','Network Exposure Function','5GC',2,1),(20,'NWDAF','Network Data Analytics Function','5GC',2,1),(21,'SCP','Service Communication Proxy','5GC',2,1),(22,'SEPP','Security Edge Protection Proxy','5GC',2,1),(23,'BSF','Binding Support Function','5GC',2,1),(24,'CHF','Charging Function','5GC',2,1),(25,'P_CSCF','Proxy CSCF','IMS',2,1),(26,'I_CSCF','Interrogating CSCF','IMS',2,1),(27,'S_CSCF','Serving CSCF','IMS',2,1),(28,'TAS','Telephony Application Server','IMS',2,1),(29,'MRF','Media Resource Function','IMS',2,1),(30,'BGCF','Breakout Gateway Control Function','IMS',2,1),(31,'MGCF','Media Gateway Control Function','IMS',2,1),(32,'SBC','Session Border Controller','IMS',2,1),(33,'DNS','DNS','COMMON',2,1),(34,'DRA','Diameter Routing Agent','COMMON',2,1),(35,'STP','Signalling Transfer Point','COMMON',2,1);
/*!40000 ALTER TABLE `NETWORK_FUNCTION_TYPE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NETWORK_SLICE`
--

DROP TABLE IF EXISTS `NETWORK_SLICE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NETWORK_SLICE` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID: this row''s supertype row (identity for relationships, external refs, attributes, reconciliation)',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NETWORK_SLICE' COMMENT 'Constant NETWORK_SLICE: FK-bound to RESOURCE so the supertype row is of this type',
  `PLMN_ID_FK` int unsigned NOT NULL COMMENT 'FK PLMN.ID',
  `SST` tinyint unsigned NOT NULL COMMENT 'Slice / service type (1 eMBB, 2 URLLC, 3 MIoT, 4 V2X, 128-255 operator-defined)',
  `SD` char(6) NOT NULL DEFAULT 'FFFFFF' COMMENT 'Slice differentiator, 6 hex digits; FFFFFF = no SD (3GPP TS 23.003)',
  `NAME` varchar(100) NOT NULL COMMENT 'Slice name',
  `STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'PLANNED' COMMENT 'Status. Values: PLANNED, ACTIVE, SUSPENDED, RETIRED',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_NETWORK_SLICE__PLMN_ID_SST_SD` (`CUSTOMER_ID`,`PLMN_ID_FK`,`SST`,`SD`),
  UNIQUE KEY `UK_NETWORK_SLICE__RESOURCE_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`RESOURCE_TYPE`),
  CONSTRAINT `FK_NETWORK_SLICE__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_NETWORK_SLICE__PLMN_ID` FOREIGN KEY (`CUSTOMER_ID`, `PLMN_ID_FK`) REFERENCES `PLMN` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_NETWORK_SLICE__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `CK_NETWORK_SLICE__RESOURCE_TYPE` CHECK ((`RESOURCE_TYPE` = _utf8mb4'NETWORK_SLICE')),
  CONSTRAINT `CK_NETWORK_SLICE__SD` CHECK (regexp_like(`SD`,_utf8mb4'^[0-9A-F]{6}$',_utf8mb4'c')),
  CONSTRAINT `CK_NETWORK_SLICE__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'PLANNED',_utf8mb4'ACTIVE',_utf8mb4'SUSPENDED',_utf8mb4'RETIRED')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='5G network slice (S-NSSAI) of a PLMN. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NETWORK_SLICE`
--

LOCK TABLES `NETWORK_SLICE` WRITE;
/*!40000 ALTER TABLE `NETWORK_SLICE` DISABLE KEYS */;
INSERT INTO `NETWORK_SLICE` VALUES (1,1,35,'NETWORK_SLICE',1,1,'000001','eMBB default','ACTIVE','2026-09-28 08:15:11.567',1,'2026-09-28 08:15:11.567',1,0);
/*!40000 ALTER TABLE `NETWORK_SLICE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `OPERATIONAL_AREA`
--

DROP TABLE IF EXISTS `OPERATIONAL_AREA`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `OPERATIONAL_AREA` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `PARENT_AREA_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK OPERATIONAL_AREA.ID: parent area; NULL for a top-level area',
  `PARENT_AREA_LEVEL` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Copy of the parent AREA_LEVEL, FK-bound; must rank above AREA_LEVEL (so the tree cannot loop)',
  `AREA_LEVEL` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Level in the operator hierarchy. Values: REGION, CIRCLE, ZONE, DIVISION, TERRITORY',
  `CODE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Area code (e.g. KA for the Karnataka circle)',
  `NAME` varchar(100) NOT NULL COMMENT 'Area name',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  `IS_DELETED` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Soft-delete flag (0 = active, 1 = deleted)',
  `LIVE_FLAG` tinyint(1) GENERATED ALWAYS AS (if((`IS_DELETED` = 0),1,NULL)) STORED COMMENT '1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_OPERATIONAL_AREA__CUSTOMER_ID_ID_AREA_LEVEL` (`CUSTOMER_ID`,`ID`,`AREA_LEVEL`),
  UNIQUE KEY `UK_OPERATIONAL_AREA__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_OPERATIONAL_AREA__AREA_LEVEL_CODE` (`CUSTOMER_ID`,`AREA_LEVEL`,`CODE`,`LIVE_FLAG`),
  KEY `IDX_OPERATIONAL_AREA__PARENT_AREA_ID` (`CUSTOMER_ID`,`PARENT_AREA_ID_FK`,`PARENT_AREA_LEVEL`),
  CONSTRAINT `FK_OPERATIONAL_AREA__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_OPERATIONAL_AREA__PARENT_AREA` FOREIGN KEY (`CUSTOMER_ID`, `PARENT_AREA_ID_FK`, `PARENT_AREA_LEVEL`) REFERENCES `OPERATIONAL_AREA` (`CUSTOMER_ID`, `ID`, `AREA_LEVEL`),
  CONSTRAINT `CK_OPERATIONAL_AREA__AREA_LEVEL_VALUES` CHECK ((`AREA_LEVEL` in (_utf8mb4'REGION',_utf8mb4'CIRCLE',_utf8mb4'ZONE',_utf8mb4'DIVISION',_utf8mb4'TERRITORY'))),
  CONSTRAINT `CK_OPERATIONAL_AREA__PARENT_LEVEL` CHECK ((((`PARENT_AREA_ID_FK` is null) = (`PARENT_AREA_LEVEL` is null)) and ((`PARENT_AREA_LEVEL` is null) or (field(`PARENT_AREA_LEVEL`,_utf8mb4'REGION',_utf8mb4'CIRCLE',_utf8mb4'ZONE',_utf8mb4'DIVISION',_utf8mb4'TERRITORY') < field(`AREA_LEVEL`,_utf8mb4'REGION',_utf8mb4'CIRCLE',_utf8mb4'ZONE',_utf8mb4'DIVISION',_utf8mb4'TERRITORY')))))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Operator hierarchy used for ownership and reporting (Region > Circle > Zone > Division > Territory). A child always sits at a lower level than its parent. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `OPERATIONAL_AREA`
--

LOCK TABLES `OPERATIONAL_AREA` WRITE;
/*!40000 ALTER TABLE `OPERATIONAL_AREA` DISABLE KEYS */;
INSERT INTO `OPERATIONAL_AREA` (`ID`, `CUSTOMER_ID`, `PARENT_AREA_ID_FK`, `PARENT_AREA_LEVEL`, `AREA_LEVEL`, `CODE`, `NAME`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`, `IS_DELETED`) VALUES (1,1,NULL,NULL,'REGION','SOUTH','South region','2026-09-28 08:15:11.530',1,'2026-09-28 08:15:11.530',1,0,0),(2,1,1,'REGION','CIRCLE','KA','Karnataka circle','2026-09-28 08:15:11.530',1,'2026-09-28 08:15:11.530',1,0,0),(3,1,2,'CIRCLE','ZONE','BLR','Bengaluru zone','2026-09-28 08:15:11.530',1,'2026-09-28 08:15:11.530',1,0,0);
/*!40000 ALTER TABLE `OPERATIONAL_AREA` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `PLMN`
--

DROP TABLE IF EXISTS `PLMN`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PLMN` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `MCC` char(3) NOT NULL COMMENT 'Mobile country code (404, 405 for India)',
  `MNC` varchar(3) NOT NULL COMMENT 'Mobile network code, 2 or 3 digits',
  `NAME` varchar(100) NOT NULL COMMENT 'Operator / PLMN name',
  `IS_HOME` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1 for the tenant''s own PLMN, 0 for a sharing partner',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_PLMN__MCC_MNC` (`CUSTOMER_ID`,`MCC`,`MNC`),
  UNIQUE KEY `UK_PLMN__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  CONSTRAINT `FK_PLMN__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `CK_PLMN__CODES` CHECK ((regexp_like(`MCC`,_utf8mb4'^[0-9]{3}$',_utf8mb4'c') and regexp_like(`MNC`,_utf8mb4'^[0-9]{2,3}$',_utf8mb4'c')))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Public land mobile network (MCC + MNC) run or shared by the tenant. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `PLMN`
--

LOCK TABLES `PLMN` WRITE;
/*!40000 ALTER TABLE `PLMN` DISABLE KEYS */;
INSERT INTO `PLMN` VALUES (1,1,'404','45','NetSingularity Karnataka',1,'2026-09-28 08:15:11.546',1,'2026-09-28 08:15:11.546',1,0),(2,1,'404','86','Partner PLMN (RAN sharing)',0,'2026-09-28 08:15:11.546',1,'2026-09-28 08:15:11.546',1,0);
/*!40000 ALTER TABLE `PLMN` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `PORT`
--

DROP TABLE IF EXISTS `PORT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PORT` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID: this row''s supertype row (identity for relationships, external refs, attributes, reconciliation)',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin GENERATED ALWAYS AS ((case `PORT_KIND` when _utf8mb4'PHYSICAL' then _utf8mb4'PORT' when _utf8mb4'MANAGEMENT' then _utf8mb4'PORT' else _utf8mb4'LOGICAL_INTERFACE' end)) STORED NOT NULL COMMENT 'Derived resource type (RESOURCE_TYPE.CODE); FK-bound to RESOURCE so the supertype row agrees',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID: the device the port belongs to (passive ODF / DDF ports live in Passive Inventory and are proxied by EXTERNAL_RESOURCE)',
  `EQUIPMENT_COMPONENT_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK EQUIPMENT_COMPONENT.ID: card / PIC the port is on (same device)',
  `TRANSCEIVER_COMPONENT_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK EQUIPMENT_COMPONENT.ID: pluggable optic seated in the port (same device)',
  `PARENT_PORT_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK PORT.ID: parent physical port or bundle of the same device (sub-interface, LAG member)',
  `VRF_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK VRF.ID: VRF the interface is bound to (same device); NULL = global table',
  `NAME` varchar(64) NOT NULL COMMENT 'Interface name (xe-0/0/3, Gi0/0/4, Port-3)',
  `PORT_KIND` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Physical or logical port; fixes the resource type. Values: PHYSICAL, SUB_INTERFACE, BUNDLE, LOOPBACK, TUNNEL, MANAGEMENT',
  `MEDIA` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Media type. Values: ETHERNET, OPTICAL, SFP, SERIAL, COAXIAL, CPRI, POWER',
  `CONNECTOR` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Connector type. Values: RJ45, LC, SC, FC, E2000, MPO, N_TYPE, DIN_4_3',
  `DIRECTION` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'BIDIRECTIONAL' COMMENT 'Port direction. Values: IN, OUT, BIDIRECTIONAL',
  `SPEED_MBPS` int unsigned DEFAULT NULL COMMENT 'Speed in Mbps (10G = 10000)',
  `MTU` smallint unsigned DEFAULT NULL COMMENT 'MTU bytes',
  `INTERFACE_INDEX` int unsigned DEFAULT NULL COMMENT 'SNMP ifIndex',
  `MAC_ADDRESS` char(17) DEFAULT NULL COMMENT 'Interface MAC, aa:bb:cc:dd:ee:ff',
  `DESCRIPTION` varchar(255) DEFAULT NULL COMMENT 'Interface description',
  `ADMIN_STATUS` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Admin status. Values: UP, DOWN',
  `OPERATIONAL_STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'UNKNOWN' COMMENT 'Operational status. Values: UP, DOWN, UNKNOWN',
  `USAGE_STATE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'FREE' COMMENT 'Capacity state; drives port total / used / free. Values: FREE, OCCUPIED, RESERVED, FAULTY, BLOCKED',
  `LAST_CHANGE_TIME` datetime(3) DEFAULT NULL COMMENT 'Last oper-status change (UTC)',
  `RECORD_STATE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'ACTIVE' COMMENT 'INACTIVE = no longer reported (Inactive inventory > Interface). Values: ACTIVE, INACTIVE',
  `INACTIVE_TIME` datetime(3) DEFAULT NULL COMMENT 'When it went inactive (UTC)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_PORT__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_PORT__RESOURCE_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`RESOURCE_TYPE`),
  UNIQUE KEY `UK_PORT__NETWORK_ELEMENT_ID_NAME` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`NAME`),
  UNIQUE KEY `UK_PORT__NETWORK_ELEMENT_ID_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`ID`),
  UNIQUE KEY `UK_PORT__TRANSCEIVER_COMPONENT_ID` (`CUSTOMER_ID`,`TRANSCEIVER_COMPONENT_ID_FK`),
  KEY `IDX_PORT__PARENT` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`PARENT_PORT_ID_FK`),
  KEY `IDX_PORT__EQUIPMENT_COMPONENT` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`EQUIPMENT_COMPONENT_ID_FK`),
  KEY `IDX_PORT__TRANSCEIVER` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`TRANSCEIVER_COMPONENT_ID_FK`),
  KEY `IDX_PORT__VRF` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`VRF_ID_FK`),
  KEY `IDX_PORT__USAGE_STATE` (`CUSTOMER_ID`,`USAGE_STATE`),
  KEY `IDX_PORT__MAC_ADDRESS` (`CUSTOMER_ID`,`MAC_ADDRESS`),
  CONSTRAINT `FK_PORT__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_PORT__EQUIPMENT_COMPONENT` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `EQUIPMENT_COMPONENT_ID_FK`) REFERENCES `EQUIPMENT_COMPONENT` (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `ID`),
  CONSTRAINT `FK_PORT__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_PORT__PARENT` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `PARENT_PORT_ID_FK`) REFERENCES `PORT` (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `ID`),
  CONSTRAINT `FK_PORT__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `FK_PORT__TRANSCEIVER` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `TRANSCEIVER_COMPONENT_ID_FK`) REFERENCES `EQUIPMENT_COMPONENT` (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `ID`),
  CONSTRAINT `FK_PORT__VRF` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `VRF_ID_FK`) REFERENCES `VRF` (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `ID`),
  CONSTRAINT `CK_PORT__ADMIN_STATUS_VALUES` CHECK ((`ADMIN_STATUS` in (_utf8mb4'UP',_utf8mb4'DOWN'))),
  CONSTRAINT `CK_PORT__CONNECTOR_VALUES` CHECK ((`CONNECTOR` in (_utf8mb4'RJ45',_utf8mb4'LC',_utf8mb4'SC',_utf8mb4'FC',_utf8mb4'E2000',_utf8mb4'MPO',_utf8mb4'N_TYPE',_utf8mb4'DIN_4_3'))),
  CONSTRAINT `CK_PORT__DIRECTION_VALUES` CHECK ((`DIRECTION` in (_utf8mb4'IN',_utf8mb4'OUT',_utf8mb4'BIDIRECTIONAL'))),
  CONSTRAINT `CK_PORT__INACTIVE` CHECK (((`RECORD_STATE` = _utf8mb4'INACTIVE') = (`INACTIVE_TIME` is not null))),
  CONSTRAINT `CK_PORT__MAC` CHECK (((`MAC_ADDRESS` is null) or regexp_like(`MAC_ADDRESS`,_utf8mb4'^[0-9a-f]{2}(:[0-9a-f]{2}){5}$',_utf8mb4'c'))),
  CONSTRAINT `CK_PORT__MEDIA_VALUES` CHECK ((`MEDIA` in (_utf8mb4'ETHERNET',_utf8mb4'OPTICAL',_utf8mb4'SFP',_utf8mb4'SERIAL',_utf8mb4'COAXIAL',_utf8mb4'CPRI',_utf8mb4'POWER'))),
  CONSTRAINT `CK_PORT__OPERATIONAL_STATUS_VALUES` CHECK ((`OPERATIONAL_STATUS` in (_utf8mb4'UP',_utf8mb4'DOWN',_utf8mb4'UNKNOWN'))),
  CONSTRAINT `CK_PORT__PORT_KIND_VALUES` CHECK ((`PORT_KIND` in (_utf8mb4'PHYSICAL',_utf8mb4'SUB_INTERFACE',_utf8mb4'BUNDLE',_utf8mb4'LOOPBACK',_utf8mb4'TUNNEL',_utf8mb4'MANAGEMENT'))),
  CONSTRAINT `CK_PORT__RECORD_STATE_VALUES` CHECK ((`RECORD_STATE` in (_utf8mb4'ACTIVE',_utf8mb4'INACTIVE'))),
  CONSTRAINT `CK_PORT__USAGE_STATE_VALUES` CHECK ((`USAGE_STATE` in (_utf8mb4'FREE',_utf8mb4'OCCUPIED',_utf8mb4'RESERVED',_utf8mb4'FAULTY',_utf8mb4'BLOCKED')))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Device interface; card, optic, parent and VRF bound to the same device. Passive-asset ports moved to Passive Inventory (proxied by EXTERNAL_RESOURCE). [v6, 2026-09-28]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `PORT`
--

LOCK TABLES `PORT` WRITE;
/*!40000 ALTER TABLE `PORT` DISABLE KEYS */;
INSERT INTO `PORT` (`ID`, `CUSTOMER_ID`, `RESOURCE_ID_FK`, `NETWORK_ELEMENT_ID_FK`, `EQUIPMENT_COMPONENT_ID_FK`, `TRANSCEIVER_COMPONENT_ID_FK`, `PARENT_PORT_ID_FK`, `VRF_ID_FK`, `NAME`, `PORT_KIND`, `MEDIA`, `CONNECTOR`, `DIRECTION`, `SPEED_MBPS`, `MTU`, `INTERFACE_INDEX`, `MAC_ADDRESS`, `DESCRIPTION`, `ADMIN_STATUS`, `OPERATIONAL_STATUS`, `USAGE_STATE`, `LAST_CHANGE_TIME`, `RECORD_STATE`, `INACTIVE_TIME`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`) VALUES (1,1,36,1,2,3,NULL,NULL,'HundredGigE0/0/0/0','PHYSICAL','OPTICAL','LC','BIDIRECTIONAL',100000,9216,17,'00:1a:2b:3c:4d:11','to BLR-CO-SW01 Eth1/49','UP','UP','OCCUPIED',NULL,'ACTIVE',NULL,'2026-09-28 08:15:11.557',6,'2026-09-28 08:15:11.557',6,0),(2,1,37,1,2,NULL,NULL,1,'HundredGigE0/0/0/1','PHYSICAL','OPTICAL','LC','BIDIRECTIONAL',100000,9216,18,'00:1a:2b:3c:4d:12','ACME PE-CE','UP','UP','OCCUPIED',NULL,'ACTIVE',NULL,'2026-09-28 08:15:11.557',6,'2026-09-28 08:15:11.557',6,0),(3,1,38,1,NULL,NULL,NULL,NULL,'Loopback0','LOOPBACK',NULL,NULL,'BIDIRECTIONAL',NULL,1500,5,NULL,'Router id','UP','UP','OCCUPIED',NULL,'ACTIVE',NULL,'2026-09-28 08:15:11.557',6,'2026-09-28 08:15:11.557',6,0),(4,1,39,2,NULL,NULL,NULL,NULL,'Ethernet1/49','PHYSICAL','OPTICAL','LC','BIDIRECTIONAL',100000,9216,49,'00:1a:2b:3c:4d:21','uplink to BLR-AGG-R07','UP','UP','OCCUPIED',NULL,'ACTIVE',NULL,'2026-09-28 08:15:11.557',6,'2026-09-28 08:15:11.557',6,0),(5,1,40,2,NULL,NULL,NULL,NULL,'Ethernet1/1','PHYSICAL','ETHERNET','RJ45','BIDIRECTIONAL',10000,9216,1,'00:1a:2b:3c:4d:22','server access','UP','UP','FREE',NULL,'ACTIVE',NULL,'2026-09-28 08:15:11.557',6,'2026-09-28 08:15:11.557',6,0);
/*!40000 ALTER TABLE `PORT` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `PORT_IP_ADDRESS`
--

DROP TABLE IF EXISTS `PORT_IP_ADDRESS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PORT_IP_ADDRESS` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `PORT_ID_FK` int unsigned NOT NULL COMMENT 'FK PORT.ID',
  `IP_ADDRESS` varchar(45) NOT NULL COMMENT 'Address, IPv4 or IPv6 text form as reported',
  `IP_ADDRESS_BINARY` varbinary(16) GENERATED ALWAYS AS (inet6_aton(`IP_ADDRESS`)) STORED NOT NULL COMMENT 'Derived canonical binary address (2001:DB8::1 and 2001:db8::1 are the same)',
  `PREFIX_LENGTH` tinyint unsigned NOT NULL COMMENT 'Prefix length (/30)',
  `IP_SUBNET_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK IP_SUBNET.ID: prefix the address falls in, when the plan has it',
  `IS_PRIMARY` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1 for the primary address',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_PORT_IP_ADDRESS__PORT_ID_IP_ADDRESS_BINARY` (`CUSTOMER_ID`,`PORT_ID_FK`,`IP_ADDRESS_BINARY`),
  KEY `IDX_PORT_IP_ADDRESS__IP_ADDRESS_BINARY` (`CUSTOMER_ID`,`IP_ADDRESS_BINARY`),
  KEY `IDX_PORT_IP_ADDRESS__IP_SUBNET_ID` (`CUSTOMER_ID`,`IP_SUBNET_ID_FK`),
  CONSTRAINT `FK_PORT_IP_ADDRESS__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_PORT_IP_ADDRESS__IP_SUBNET_ID` FOREIGN KEY (`CUSTOMER_ID`, `IP_SUBNET_ID_FK`) REFERENCES `IP_SUBNET` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_PORT_IP_ADDRESS__PORT_ID` FOREIGN KEY (`CUSTOMER_ID`, `PORT_ID_FK`) REFERENCES `PORT` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `CK_PORT_IP_ADDRESS__IP` CHECK ((is_ipv4(`IP_ADDRESS`) or is_ipv6(`IP_ADDRESS`))),
  CONSTRAINT `CK_PORT_IP_ADDRESS__PREFIX` CHECK (((`PREFIX_LENGTH` <= 128) and ((not(is_ipv4(`IP_ADDRESS`))) or (`PREFIX_LENGTH` <= 32))))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='IP address on an interface and its subnet. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `PORT_IP_ADDRESS`
--

LOCK TABLES `PORT_IP_ADDRESS` WRITE;
/*!40000 ALTER TABLE `PORT_IP_ADDRESS` DISABLE KEYS */;
INSERT INTO `PORT_IP_ADDRESS` (`ID`, `CUSTOMER_ID`, `PORT_ID_FK`, `IP_ADDRESS`, `PREFIX_LENGTH`, `IP_SUBNET_ID_FK`, `IS_PRIMARY`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`) VALUES (1,1,1,'10.20.7.1',24,1,1,'2026-09-28 08:15:11.561',6,'2026-09-28 08:15:11.561',6,0),(2,1,3,'10.255.0.7',32,2,1,'2026-09-28 08:15:11.561',6,'2026-09-28 08:15:11.561',6,0);
/*!40000 ALTER TABLE `PORT_IP_ADDRESS` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `PORT_VLAN`
--

DROP TABLE IF EXISTS `PORT_VLAN`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PORT_VLAN` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID: device of both the port and the VLAN',
  `PORT_ID_FK` int unsigned NOT NULL COMMENT 'FK PORT.ID (same device)',
  `VLAN_ID_FK` int unsigned NOT NULL COMMENT 'FK VLAN.ID (same device)',
  `MODE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Access or trunk membership. Values: ACCESS, TRUNK',
  `STP_STATE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Spanning-tree state. Values: FORWARDING, BLOCKING, LEARNING, DISABLED',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_PORT_VLAN__PORT_ID_VLAN_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`PORT_ID_FK`,`VLAN_ID_FK`),
  KEY `IDX_PORT_VLAN__VLAN_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`VLAN_ID_FK`),
  CONSTRAINT `FK_PORT_VLAN__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_PORT_VLAN__PORT` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `PORT_ID_FK`) REFERENCES `PORT` (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `FK_PORT_VLAN__VLAN` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `VLAN_ID_FK`) REFERENCES `VLAN` (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `CK_PORT_VLAN__MODE_VALUES` CHECK ((`MODE` in (_utf8mb4'ACCESS',_utf8mb4'TRUNK'))),
  CONSTRAINT `CK_PORT_VLAN__STP_STATE_VALUES` CHECK ((`STP_STATE` in (_utf8mb4'FORWARDING',_utf8mb4'BLOCKING',_utf8mb4'LEARNING',_utf8mb4'DISABLED')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='VLAN membership of a port on the same device. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `PORT_VLAN`
--

LOCK TABLES `PORT_VLAN` WRITE;
/*!40000 ALTER TABLE `PORT_VLAN` DISABLE KEYS */;
INSERT INTO `PORT_VLAN` VALUES (1,1,2,5,1,'ACCESS','FORWARDING','2026-09-28 08:15:11.562',6,'2026-09-28 08:15:11.562',6,0);
/*!40000 ALTER TABLE `PORT_VLAN` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `POWER_FEED`
--

DROP TABLE IF EXISTS `POWER_FEED`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `POWER_FEED` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `SITE_ID_FK` int unsigned NOT NULL COMMENT 'FK SITE.ID',
  `CODE` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Feed id',
  `KIND` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'AC or DC feed. Values: AC, DC',
  `FEED_SOURCE` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Supplier / rectifier source',
  `RATING_KW` decimal(7,2) NOT NULL COMMENT 'Rated capacity in kW',
  `LOAD_KW` decimal(7,2) DEFAULT NULL COMMENT 'Last measured load in kW',
  `STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'NORMAL' COMMENT 'Feed status. Values: NORMAL, HIGH, ALARM',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_POWER_FEED__SITE_ID_CODE` (`CUSTOMER_ID`,`SITE_ID_FK`,`CODE`),
  CONSTRAINT `FK_POWER_FEED__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_POWER_FEED__SITE_ID` FOREIGN KEY (`CUSTOMER_ID`, `SITE_ID_FK`) REFERENCES `SITE` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `CK_POWER_FEED__KIND_VALUES` CHECK ((`KIND` in (_utf8mb4'AC',_utf8mb4'DC'))),
  CONSTRAINT `CK_POWER_FEED__LOAD` CHECK (((`RATING_KW` > 0) and ((`LOAD_KW` is null) or (`LOAD_KW` >= 0)))),
  CONSTRAINT `CK_POWER_FEED__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'NORMAL',_utf8mb4'HIGH',_utf8mb4'ALARM')))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Power feed into a site (facility tab: AC / DC feeds with rating and load). Kept pending validation (facility attribute, not a resource). [v6, 2026-09-28]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `POWER_FEED`
--

LOCK TABLES `POWER_FEED` WRITE;
/*!40000 ALTER TABLE `POWER_FEED` DISABLE KEYS */;
INSERT INTO `POWER_FEED` VALUES (1,1,1,'MAINS-1','AC','BESCOM grid',15.00,6.20,'NORMAL','2026-09-28 08:15:11.539',1,'2026-09-28 08:15:11.539',1,0),(2,1,1,'DC-48V','DC','Rectifier bus',12.00,5.10,'NORMAL','2026-09-28 08:15:11.539',1,'2026-09-28 08:15:11.539',1,0),(3,1,2,'MAINS-A','AC','BESCOM grid',60.00,41.50,'HIGH','2026-09-28 08:15:11.539',1,'2026-09-28 08:15:11.539',1,0);
/*!40000 ALTER TABLE `POWER_FEED` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `PRODUCT_MODEL`
--

DROP TABLE IF EXISTS `PRODUCT_MODEL`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PRODUCT_MODEL` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK (catalog; INT: part numbers of cards and optics run to tens of thousands)',
  `VENDOR_ID_FK` smallint unsigned NOT NULL COMMENT 'FK VENDOR.ID',
  `MODEL` varchar(64) NOT NULL COMMENT 'Model / part number (MX204, AAU5613, SFP-10G-LR, AQU4518R11)',
  `PRODUCT_CATEGORY` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'What the product is. Values: NETWORK_ELEMENT, CHASSIS, CARD, MODULE, TRANSCEIVER, ANTENNA, PASSIVE, POWER, OTHER',
  `NETWORK_ELEMENT_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'FK NETWORK_ELEMENT_TYPE.CODE: device type, only for NETWORK_ELEMENT products',
  `DESCRIPTION` varchar(255) DEFAULT NULL COMMENT 'Vendor description',
  `SNMP_SYSTEM_OID` varchar(128) DEFAULT NULL COMMENT 'SNMP sysObjectID that identifies this model during discovery',
  `PORT_COUNT` smallint unsigned DEFAULT NULL COMMENT 'Front-panel port count of the base unit',
  `RACK_UNITS` tinyint unsigned DEFAULT NULL COMMENT 'Height in rack units',
  `POWER_DRAW_W` int unsigned DEFAULT NULL COMMENT 'Typical power draw in watts',
  `END_OF_SALE_DATE` date DEFAULT NULL COMMENT 'Vendor End-of-Sale date',
  `END_OF_LIFE_DATE` date DEFAULT NULL COMMENT 'Vendor End-of-Life / end-of-support date; the EoL band is derived',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_PRODUCT_MODEL__VENDOR_ID_MODEL` (`VENDOR_ID_FK`,`MODEL`),
  UNIQUE KEY `UK_PRODUCT_MODEL__VENDOR_ID_ID` (`VENDOR_ID_FK`,`ID`),
  UNIQUE KEY `UK_PRODUCT_MODEL__VENDOR_ID_ID_NETWORK_ELEMENT_TYPE` (`VENDOR_ID_FK`,`ID`,`NETWORK_ELEMENT_TYPE`),
  UNIQUE KEY `UK_PRODUCT_MODEL__SNMP_SYSTEM_OID` (`SNMP_SYSTEM_OID`),
  KEY `IDX_PRODUCT_MODEL__NETWORK_ELEMENT_TYPE` (`NETWORK_ELEMENT_TYPE`),
  CONSTRAINT `FK_PRODUCT_MODEL__NETWORK_ELEMENT_TYPE` FOREIGN KEY (`NETWORK_ELEMENT_TYPE`) REFERENCES `NETWORK_ELEMENT_TYPE` (`CODE`),
  CONSTRAINT `FK_PRODUCT_MODEL__VENDOR_ID` FOREIGN KEY (`VENDOR_ID_FK`) REFERENCES `VENDOR` (`ID`),
  CONSTRAINT `CK_PRODUCT_MODEL__EOS_BEFORE_EOL` CHECK (((`END_OF_SALE_DATE` is null) or (`END_OF_LIFE_DATE` is null) or (`END_OF_SALE_DATE` <= `END_OF_LIFE_DATE`))),
  CONSTRAINT `CK_PRODUCT_MODEL__NETWORK_ELEMENT_TYPE` CHECK (((`PRODUCT_CATEGORY` = _utf8mb4'NETWORK_ELEMENT') = (`NETWORK_ELEMENT_TYPE` is not null))),
  CONSTRAINT `CK_PRODUCT_MODEL__PRODUCT_CATEGORY_VALUES` CHECK ((`PRODUCT_CATEGORY` in (_utf8mb4'NETWORK_ELEMENT',_utf8mb4'CHASSIS',_utf8mb4'CARD',_utf8mb4'MODULE',_utf8mb4'TRANSCEIVER',_utf8mb4'ANTENNA',_utf8mb4'PASSIVE',_utf8mb4'POWER',_utf8mb4'OTHER')))
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Vendor product catalog for devices, cards, optics, antennas, passive and power products, with lifecycle dates. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `PRODUCT_MODEL`
--

LOCK TABLES `PRODUCT_MODEL` WRITE;
/*!40000 ALTER TABLE `PRODUCT_MODEL` DISABLE KEYS */;
INSERT INTO `PRODUCT_MODEL` VALUES (1,1,'ASR-9906','NETWORK_ELEMENT','ROUTER','Aggregation services router','1.3.6.1.4.1.9.1.2408',NULL,10,3200,'2027-06-30','2030-06-30'),(2,1,'N9K-C93180YC-FX','NETWORK_ELEMENT','SWITCH','Nexus 9300 access switch','1.3.6.1.4.1.9.12.3.1.3.1795',54,1,650,NULL,NULL),(3,4,'6500-D7','NETWORK_ELEMENT','OPTICAL','Packet-optical platform',NULL,NULL,7,1800,NULL,NULL),(4,2,'Baseband 6630','NETWORK_ELEMENT','GNODEB','5G baseband unit',NULL,NULL,1,400,NULL,NULL),(5,2,'AIR 6449','NETWORK_ELEMENT','RADIO_UNIT','Massive MIMO radio n78',NULL,NULL,NULL,1100,NULL,NULL),(6,5,'PowerEdge R760','NETWORK_ELEMENT','SERVER','Compute host',NULL,NULL,2,1400,NULL,NULL),(7,1,'A9K-8X100GE-SE','CARD',NULL,'8 x 100GE line card',NULL,8,NULL,450,NULL,NULL),(8,1,'QSFP-100G-LR4-S','TRANSCEIVER',NULL,'100G LR4 optic',NULL,NULL,NULL,4,NULL,NULL),(9,6,'80010965','ANTENNA',NULL,'Panel antenna 3.5 GHz',NULL,4,NULL,NULL,NULL,NULL),(10,3,'CMM','NETWORK_ELEMENT','CORE_NF','Cloud Mobility Manager (AMF)',NULL,NULL,NULL,NULL,NULL,NULL),(11,2,'RECT-48V-12K','NETWORK_ELEMENT','POWER_CONTROLLER','Rectifier controller',NULL,NULL,1,60,NULL,NULL);
/*!40000 ALTER TABLE `PRODUCT_MODEL` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `PRODUCT_MODEL_POLICY`
--

DROP TABLE IF EXISTS `PRODUCT_MODEL_POLICY`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PRODUCT_MODEL_POLICY` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `PRODUCT_MODEL_ID_FK` int unsigned NOT NULL COMMENT 'FK PRODUCT_MODEL.ID',
  `RECOMMENDED_OS_VERSION` varchar(64) NOT NULL COMMENT 'Golden OS version; devices on another version are BEHIND for compliance',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_PRODUCT_MODEL_POLICY__PRODUCT_MODEL_ID` (`CUSTOMER_ID`,`PRODUCT_MODEL_ID_FK`),
  KEY `IDX_PRODUCT_MODEL_POLICY__PRODUCT_MODEL_ID` (`PRODUCT_MODEL_ID_FK`),
  CONSTRAINT `FK_PRODUCT_MODEL_POLICY__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_PRODUCT_MODEL_POLICY__PRODUCT_MODEL_ID` FOREIGN KEY (`PRODUCT_MODEL_ID_FK`) REFERENCES `PRODUCT_MODEL` (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Per-tenant golden software version of a product model. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `PRODUCT_MODEL_POLICY`
--

LOCK TABLES `PRODUCT_MODEL_POLICY` WRITE;
/*!40000 ALTER TABLE `PRODUCT_MODEL_POLICY` DISABLE KEYS */;
INSERT INTO `PRODUCT_MODEL_POLICY` VALUES (1,1,1,'7.9.2','2026-09-28 08:15:11.535',1,'2026-09-28 08:15:11.535',1,0),(2,1,2,'10.2(5)','2026-09-28 08:15:11.535',1,'2026-09-28 08:15:11.535',1,0);
/*!40000 ALTER TABLE `PRODUCT_MODEL_POLICY` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RACK`
--

DROP TABLE IF EXISTS `RACK`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RACK` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID: this row''s supertype row (identity for relationships, external refs, attributes, reconciliation)',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'RACK' COMMENT 'Constant RACK: FK-bound to RESOURCE so the supertype row is of this type',
  `SITE_ID_FK` int unsigned NOT NULL COMMENT 'FK SITE.ID: site of the rack (FK-bound to the room''s site when ROOM_ID_FK is set)',
  `ROOM_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK ROOM.ID; NULL for outdoor cabinets and shelters with no room',
  `CODE` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Rack id (R-01, CAB-2)',
  `RACK_TYPE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'RACK' COMMENT 'Kind of enclosure. Values: RACK, OUTDOOR_CABINET, SHELTER_RACK, WALL_MOUNT',
  `ROLE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'ACTIVE' COMMENT 'Rack role. Values: ACTIVE, PASSIVE, MIXED, POWER',
  `HEIGHT_RACK_UNITS` tinyint unsigned NOT NULL DEFAULT '42' COMMENT 'Rack height in rack units',
  `POWER_BUDGET_KW` decimal(6,2) DEFAULT NULL COMMENT 'Power budget in kW',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RACK__SITE_ID_CODE` (`CUSTOMER_ID`,`SITE_ID_FK`,`CODE`),
  UNIQUE KEY `UK_RACK__SITE_ID_ID` (`CUSTOMER_ID`,`SITE_ID_FK`,`ID`),
  UNIQUE KEY `UK_RACK__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_RACK__RESOURCE_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`RESOURCE_TYPE`),
  KEY `IDX_RACK__SITE_ID_ROOM_ID` (`CUSTOMER_ID`,`SITE_ID_FK`,`ROOM_ID_FK`),
  CONSTRAINT `FK_RACK__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RACK__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `FK_RACK__SITE_ID` FOREIGN KEY (`CUSTOMER_ID`, `SITE_ID_FK`) REFERENCES `SITE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RACK__SITE_ID_ROOM_ID` FOREIGN KEY (`CUSTOMER_ID`, `SITE_ID_FK`, `ROOM_ID_FK`) REFERENCES `ROOM` (`CUSTOMER_ID`, `SITE_ID_FK`, `ID`),
  CONSTRAINT `CK_RACK__HEIGHT` CHECK ((`HEIGHT_RACK_UNITS` between 1 and 60)),
  CONSTRAINT `CK_RACK__POWER_BUDGET` CHECK (((`POWER_BUDGET_KW` is null) or (`POWER_BUDGET_KW` > 0))),
  CONSTRAINT `CK_RACK__RACK_TYPE_VALUES` CHECK ((`RACK_TYPE` in (_utf8mb4'RACK',_utf8mb4'OUTDOOR_CABINET',_utf8mb4'SHELTER_RACK',_utf8mb4'WALL_MOUNT'))),
  CONSTRAINT `CK_RACK__RESOURCE_TYPE` CHECK ((`RESOURCE_TYPE` = _utf8mb4'RACK')),
  CONSTRAINT `CK_RACK__ROLE_VALUES` CHECK ((`ROLE` in (_utf8mb4'ACTIVE',_utf8mb4'PASSIVE',_utf8mb4'MIXED',_utf8mb4'POWER'))),
  CONSTRAINT `CK_RACK__ROOM` CHECK (((`RACK_TYPE` in (_utf8mb4'OUTDOOR_CABINET',_utf8mb4'SHELTER_RACK')) or (`ROOM_ID_FK` is not null)))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Equipment rack, outdoor cabinet or shelter rack; always at a site, in a room when indoors. Kept in Inventory pending validation: NETWORK_ELEMENT placement depends on it; Passive Inventory may own racks later. [v6, 2026-09-28]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RACK`
--

LOCK TABLES `RACK` WRITE;
/*!40000 ALTER TABLE `RACK` DISABLE KEYS */;
INSERT INTO `RACK` VALUES (1,1,4,'RACK',2,1,'R-04','RACK','ACTIVE',42,6.00,'2026-09-28 08:15:11.539',1,'2026-09-28 08:15:11.539',1,0),(2,1,5,'RACK',3,3,'DC-A01','RACK','ACTIVE',47,12.00,'2026-09-28 08:15:11.539',1,'2026-09-28 08:15:11.539',1,0),(3,1,6,'RACK',1,NULL,'CAB-1','OUTDOOR_CABINET','MIXED',20,3.00,'2026-09-28 08:15:11.539',1,'2026-09-28 08:15:11.539',1,0);
/*!40000 ALTER TABLE `RACK` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RADIO_CELL`
--

DROP TABLE IF EXISTS `RADIO_CELL`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RADIO_CELL` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID: this row''s supertype row (identity for relationships, external refs, attributes, reconciliation)',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'RADIO_CELL' COMMENT 'Constant RADIO_CELL: FK-bound to RESOURCE so the supertype row is of this type',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID: owning RAN node (BTS, NodeB, eNodeB, gNodeB or gNB-DU)',
  `NODE_NETWORK_ELEMENT_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Copy of the node NETWORK_ELEMENT_TYPE, FK-bound; must be BTS, NODEB, ENODEB, GNODEB or GNB_DU',
  `RADIO_SECTOR_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK RADIO_SECTOR.ID the cell radiates in',
  `TECHNOLOGY_CODE` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Radio technology (GSM, UMTS, LTE, NB_IOT, NR); FK-bound with BAND_CODE to FREQUENCY_BAND',
  `BAND_CODE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Band of that technology (GSM900, B1, B3, n78); FREQUENCY_BAND (TECHNOLOGY_CODE, CODE)',
  `CELL_NAME` varchar(100) NOT NULL COMMENT 'Cell name',
  `LOCAL_CELL_ID` int unsigned DEFAULT NULL COMMENT 'Cell id within the node (LCID / cell index)',
  `CELL_IDENTITY` bigint unsigned DEFAULT NULL COMMENT 'CI (2G / 3G, 16 bit), ECI (28 bit) or NCI (36 bit); NULL while planned',
  `LAC_TAC` int unsigned DEFAULT NULL COMMENT 'LAC (2G / 3G, 16 bit) or TAC (4G 16 bit / 5G 24 bit)',
  `CELL_KEY` varchar(40) GENERATED ALWAYS AS (if((`CELL_IDENTITY` is null),NULL,if((`TECHNOLOGY_CODE` in (_utf8mb4'GSM',_utf8mb4'UMTS')),concat(`LAC_TAC`,_utf8mb4':',`CELL_IDENTITY`),cast(`CELL_IDENTITY` as char charset utf8mb4)))) STORED COMMENT 'Derived identity: LAC:CI for 2G / 3G, ECI / NCI otherwise; unique per technology',
  `PHYSICAL_CELL_ID` smallint unsigned DEFAULT NULL COMMENT 'BSIC (GSM 0-63), PSC (UMTS 0-511), PCI (LTE 0-503, NR 0-1007)',
  `ARFCN_DOWNLINK` int unsigned DEFAULT NULL COMMENT 'Downlink ARFCN / UARFCN / EARFCN / NR-ARFCN',
  `ARFCN_UPLINK` int unsigned DEFAULT NULL COMMENT 'Uplink channel number (FDD)',
  `BANDWIDTH_MHZ` decimal(5,1) DEFAULT NULL COMMENT 'Channel bandwidth, MHz (0.2 GSM, 5 UMTS, up to 400 NR)',
  `ROOT_SEQUENCE_INDEX` smallint unsigned DEFAULT NULL COMMENT 'PRACH root sequence index (LTE 0-837, NR 0-1023)',
  `MAX_TRANSMIT_POWER_DBM` decimal(5,2) DEFAULT NULL COMMENT 'Maximum transmit power, dBm',
  `MIMO_MODE` varchar(16) DEFAULT NULL COMMENT 'MIMO configuration (2T2R, 4T4R, 32T32R, 64T64R)',
  `CELL_STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'PLANNED' COMMENT 'Cell status. Values: PLANNED, ON_AIR, LOCKED, OFF_AIR',
  `PLANNED_ON_AIR_DATE` date DEFAULT NULL COMMENT 'Planned on-air date (was RADIO_BAND.TENTATIVE_ON_AIR_DATE)',
  `ON_AIR_TIME` datetime(3) DEFAULT NULL COMMENT 'Actual on-air time (UTC)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RADIO_CELL__NETWORK_ELEMENT_ID_CELL_NAME` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`CELL_NAME`),
  UNIQUE KEY `UK_RADIO_CELL__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_RADIO_CELL__RESOURCE_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`RESOURCE_TYPE`),
  UNIQUE KEY `UK_RADIO_CELL__TECHNOLOGY_CODE_CELL_KEY` (`CUSTOMER_ID`,`TECHNOLOGY_CODE`,`CELL_KEY`),
  KEY `IDX_RADIO_CELL__NODE` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`NODE_NETWORK_ELEMENT_TYPE`),
  KEY `IDX_RADIO_CELL__RADIO_SECTOR_ID` (`CUSTOMER_ID`,`RADIO_SECTOR_ID_FK`),
  KEY `IDX_RADIO_CELL__TECHNOLOGY_CODE_BAND_CODE` (`TECHNOLOGY_CODE`,`BAND_CODE`),
  KEY `IDX_RADIO_CELL__PHYSICAL_CELL_ID` (`CUSTOMER_ID`,`PHYSICAL_CELL_ID`),
  CONSTRAINT `FK_RADIO_CELL__BAND` FOREIGN KEY (`TECHNOLOGY_CODE`, `BAND_CODE`) REFERENCES `FREQUENCY_BAND` (`TECHNOLOGY_CODE`, `CODE`),
  CONSTRAINT `FK_RADIO_CELL__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RADIO_CELL__NODE` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `NODE_NETWORK_ELEMENT_TYPE`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`, `NETWORK_ELEMENT_TYPE`),
  CONSTRAINT `FK_RADIO_CELL__RADIO_SECTOR_ID` FOREIGN KEY (`CUSTOMER_ID`, `RADIO_SECTOR_ID_FK`) REFERENCES `RADIO_SECTOR` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RADIO_CELL__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `CK_RADIO_CELL__CELL_STATUS_VALUES` CHECK ((`CELL_STATUS` in (_utf8mb4'PLANNED',_utf8mb4'ON_AIR',_utf8mb4'LOCKED',_utf8mb4'OFF_AIR'))),
  CONSTRAINT `CK_RADIO_CELL__IDENTITY_RANGE` CHECK (((`CELL_IDENTITY` is null) or (`CELL_IDENTITY` < (case when (`TECHNOLOGY_CODE` = _utf8mb4'NR') then 68719476736 when (`TECHNOLOGY_CODE` in (_utf8mb4'GSM',_utf8mb4'UMTS')) then 268435456 else 268435456 end)))),
  CONSTRAINT `CK_RADIO_CELL__LAC_NEEDED` CHECK (((`CELL_IDENTITY` is null) or (`TECHNOLOGY_CODE` not in (_utf8mb4'GSM',_utf8mb4'UMTS')) or (`LAC_TAC` is not null))),
  CONSTRAINT `CK_RADIO_CELL__LAC_TAC_RANGE` CHECK (((`LAC_TAC` is null) or (`LAC_TAC` < if((`TECHNOLOGY_CODE` = _utf8mb4'NR'),16777216,65536)))),
  CONSTRAINT `CK_RADIO_CELL__MEASURES` CHECK ((((`BANDWIDTH_MHZ` is null) or (`BANDWIDTH_MHZ` between 0.1 and 400)) and ((`MAX_TRANSMIT_POWER_DBM` is null) or (`MAX_TRANSMIT_POWER_DBM` between -(10) and 70)) and ((`ROOT_SEQUENCE_INDEX` is null) or (`ROOT_SEQUENCE_INDEX` <= 1023)))),
  CONSTRAINT `CK_RADIO_CELL__MIMO_MODE` CHECK (((`MIMO_MODE` is null) or regexp_like(`MIMO_MODE`,_utf8mb4'^[0-9]{1,3}T[0-9]{1,3}R$',_utf8mb4'c'))),
  CONSTRAINT `CK_RADIO_CELL__NODE_TECHNOLOGY` CHECK ((((`NODE_NETWORK_ELEMENT_TYPE` = _utf8mb4'BTS') and (`TECHNOLOGY_CODE` = _utf8mb4'GSM')) or ((`NODE_NETWORK_ELEMENT_TYPE` = _utf8mb4'NODEB') and (`TECHNOLOGY_CODE` = _utf8mb4'UMTS')) or ((`NODE_NETWORK_ELEMENT_TYPE` = _utf8mb4'ENODEB') and (`TECHNOLOGY_CODE` in (_utf8mb4'LTE',_utf8mb4'NB_IOT',_utf8mb4'LTE_M'))) or ((`NODE_NETWORK_ELEMENT_TYPE` in (_utf8mb4'GNODEB',_utf8mb4'GNB_DU')) and (`TECHNOLOGY_CODE` = _utf8mb4'NR')))),
  CONSTRAINT `CK_RADIO_CELL__NODE_TYPE` CHECK ((`NODE_NETWORK_ELEMENT_TYPE` in (_utf8mb4'BTS',_utf8mb4'NODEB',_utf8mb4'ENODEB',_utf8mb4'GNODEB',_utf8mb4'GNB_DU'))),
  CONSTRAINT `CK_RADIO_CELL__ON_AIR` CHECK (((`CELL_STATUS` = _utf8mb4'PLANNED') or (`CELL_IDENTITY` is not null))),
  CONSTRAINT `CK_RADIO_CELL__PHYSICAL_CELL_ID` CHECK (((`PHYSICAL_CELL_ID` is null) or (`PHYSICAL_CELL_ID` <= (case `TECHNOLOGY_CODE` when _utf8mb4'GSM' then 63 when _utf8mb4'UMTS' then 511 when _utf8mb4'NR' then 1007 else 503 end)))),
  CONSTRAINT `CK_RADIO_CELL__RESOURCE_TYPE` CHECK ((`RESOURCE_TYPE` = _utf8mb4'RADIO_CELL'))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Radio cell of any generation, bound to its node, technology, band and sector. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RADIO_CELL`
--

LOCK TABLES `RADIO_CELL` WRITE;
/*!40000 ALTER TABLE `RADIO_CELL` DISABLE KEYS */;
INSERT INTO `RADIO_CELL` (`ID`, `CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`, `NETWORK_ELEMENT_ID_FK`, `NODE_NETWORK_ELEMENT_TYPE`, `RADIO_SECTOR_ID_FK`, `TECHNOLOGY_CODE`, `BAND_CODE`, `CELL_NAME`, `LOCAL_CELL_ID`, `CELL_IDENTITY`, `LAC_TAC`, `PHYSICAL_CELL_ID`, `ARFCN_DOWNLINK`, `ARFCN_UPLINK`, `BANDWIDTH_MHZ`, `ROOT_SEQUENCE_INDEX`, `MAX_TRANSMIT_POWER_DBM`, `MIMO_MODE`, `CELL_STATUS`, `PLANNED_ON_AIR_DATE`, `ON_AIR_TIME`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`) VALUES (1,1,23,'RADIO_CELL',4,'GNODEB',1,'NR','n78','BLR-277-S1-N78',1,5560321,40021,231,636666,NULL,100.0,204,43.00,'64T64R','ON_AIR','2024-05-01','2024-05-12 10:00:00.000','2026-09-28 08:15:11.564',1,'2026-09-28 08:15:11.564',1,0),(2,1,24,'RADIO_CELL',4,'GNODEB',2,'NR','n78','BLR-277-S2-N78',2,5560322,40021,214,636666,NULL,100.0,205,43.00,'64T64R','ON_AIR','2024-05-01','2024-05-12 10:00:00.000','2026-09-28 08:15:11.564',1,'2026-09-28 08:15:11.564',1,0);
/*!40000 ALTER TABLE `RADIO_CELL` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RADIO_CELL_PLMN`
--

DROP TABLE IF EXISTS `RADIO_CELL_PLMN`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RADIO_CELL_PLMN` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RADIO_CELL_ID_FK` int unsigned NOT NULL COMMENT 'FK RADIO_CELL.ID',
  `PLMN_ID_FK` int unsigned NOT NULL COMMENT 'FK PLMN.ID',
  `IS_PRIMARY` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 for the primary PLMN of the cell',
  `PRIMARY_FLAG` tinyint(1) GENERATED ALWAYS AS (if((`IS_PRIMARY` = 1),1,NULL)) STORED COMMENT 'Derived: keeps one primary PLMN per cell',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RADIO_CELL_PLMN__RADIO_CELL_ID_PLMN_ID` (`CUSTOMER_ID`,`RADIO_CELL_ID_FK`,`PLMN_ID_FK`),
  UNIQUE KEY `UK_RADIO_CELL_PLMN__RADIO_CELL_ID_PRIMARY` (`CUSTOMER_ID`,`RADIO_CELL_ID_FK`,`PRIMARY_FLAG`),
  KEY `IDX_RADIO_CELL_PLMN__PLMN_ID` (`CUSTOMER_ID`,`PLMN_ID_FK`),
  CONSTRAINT `FK_RADIO_CELL_PLMN__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RADIO_CELL_PLMN__PLMN_ID` FOREIGN KEY (`CUSTOMER_ID`, `PLMN_ID_FK`) REFERENCES `PLMN` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RADIO_CELL_PLMN__RADIO_CELL_ID` FOREIGN KEY (`CUSTOMER_ID`, `RADIO_CELL_ID_FK`) REFERENCES `RADIO_CELL` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='PLMN broadcast by a cell (RAN sharing: several PLMNs per cell); exactly one primary. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RADIO_CELL_PLMN`
--

LOCK TABLES `RADIO_CELL_PLMN` WRITE;
/*!40000 ALTER TABLE `RADIO_CELL_PLMN` DISABLE KEYS */;
INSERT INTO `RADIO_CELL_PLMN` (`ID`, `CUSTOMER_ID`, `RADIO_CELL_ID_FK`, `PLMN_ID_FK`, `IS_PRIMARY`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`) VALUES (1,1,1,1,1,'2026-09-28 08:15:11.565',1,'2026-09-28 08:15:11.565',1,0),(2,1,1,2,0,'2026-09-28 08:15:11.565',1,'2026-09-28 08:15:11.565',1,0),(3,1,2,1,1,'2026-09-28 08:15:11.565',1,'2026-09-28 08:15:11.565',1,0);
/*!40000 ALTER TABLE `RADIO_CELL_PLMN` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RADIO_SECTOR`
--

DROP TABLE IF EXISTS `RADIO_SECTOR`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RADIO_SECTOR` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID: this row''s supertype row (identity for relationships, external refs, attributes, reconciliation)',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'RADIO_SECTOR' COMMENT 'Constant RADIO_SECTOR: FK-bound to RESOURCE so the supertype row is of this type',
  `SITE_ID_FK` int unsigned NOT NULL COMMENT 'FK SITE.ID: site where the sector radiates (coverage site)',
  `SECTOR_NUMBER` tinyint unsigned NOT NULL COMMENT 'Sector number at the site (1-24)',
  `NAME` varchar(64) DEFAULT NULL COMMENT 'Sector label (Alpha, S1, North)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RADIO_SECTOR__SITE_ID_SECTOR_NUMBER` (`CUSTOMER_ID`,`SITE_ID_FK`,`SECTOR_NUMBER`),
  UNIQUE KEY `UK_RADIO_SECTOR__SITE_ID_ID` (`CUSTOMER_ID`,`SITE_ID_FK`,`ID`),
  UNIQUE KEY `UK_RADIO_SECTOR__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_RADIO_SECTOR__RESOURCE_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`RESOURCE_TYPE`),
  CONSTRAINT `FK_RADIO_SECTOR__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RADIO_SECTOR__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `FK_RADIO_SECTOR__SITE_ID` FOREIGN KEY (`CUSTOMER_ID`, `SITE_ID_FK`) REFERENCES `SITE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_RADIO_SECTOR__RESOURCE_TYPE` CHECK ((`RESOURCE_TYPE` = _utf8mb4'RADIO_SECTOR')),
  CONSTRAINT `CK_RADIO_SECTOR__SECTOR_NUMBER` CHECK ((`SECTOR_NUMBER` between 1 and 24))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Sector of a radio site grouping antennas and cells of all technologies. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RADIO_SECTOR`
--

LOCK TABLES `RADIO_SECTOR` WRITE;
/*!40000 ALTER TABLE `RADIO_SECTOR` DISABLE KEYS */;
INSERT INTO `RADIO_SECTOR` VALUES (1,1,19,'RADIO_SECTOR',1,1,'Alpha','2026-09-28 08:15:11.562',1,'2026-09-28 08:15:11.562',1,0),(2,1,20,'RADIO_SECTOR',1,2,'Beta','2026-09-28 08:15:11.562',1,'2026-09-28 08:15:11.562',1,0);
/*!40000 ALTER TABLE `RADIO_SECTOR` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RECONCILIATION_EXCEPTION`
--

DROP TABLE IF EXISTS `RECONCILIATION_EXCEPTION`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RECONCILIATION_EXCEPTION` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `CODE` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Exception id',
  `STATE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'What is wrong. Values: ROGUE, DRIFTED, MISSING, DUPLICATE, UNCLAIMED, NO_ADAPTER, ZOMBIE',
  `DISCREPANCY_TYPE_ID_FK` smallint unsigned NOT NULL COMMENT 'FK DISCREPANCY_TYPE.ID',
  `DOMAIN_ID_FK` smallint unsigned NOT NULL COMMENT 'FK DOMAIN.ID: network domain (RAN, Core, Transport, Transport > IP/MPLS); one dimension shared by Discovery, Reconciliation and Inventory',
  `RECONCILIATION_RULE_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK RECONCILIATION_RULE.ID that raised it',
  `RECONCILIATION_RESULT_ID_FK` bigint unsigned DEFAULT NULL COMMENT 'FK RECONCILIATION_RESULT.ID it came from',
  `RESOURCE_ID_FK` bigint unsigned DEFAULT NULL COMMENT 'FK RESOURCE.ID: the inventory subject (any type)',
  `SCAN_TARGET_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK SCAN_TARGET.ID subject, when network-only (rogue)',
  `SUBJECT_DETAIL` varchar(200) DEFAULT NULL COMMENT 'Detail within the subject (wavelength 1550.12nm; OEM name)',
  `AFFECTED_RECORD_COUNT` int unsigned NOT NULL DEFAULT '1' COMMENT 'Records covered (bulk exception: 118 records)',
  `DETECTED_TIME` datetime(3) NOT NULL COMMENT 'Detected (UTC); age and age band are derived',
  `SLA_DUE_TIME` datetime(3) NOT NULL COMMENT 'SLA deadline (UTC); On track / At risk (final quarter) / Breached is derived',
  `OWNER_TEAM_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK TEAM.ID; NULL = Unassigned',
  `ASSIGNEE_ID_FK` bigint unsigned DEFAULT NULL COMMENT 'FK USER.ID: individual assignee',
  `STATUS` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'OPEN' COMMENT 'Workflow status. Values: OPEN, IN_PROGRESS, RESOLVED, ACCEPTED_EXCEPTION',
  `DISPOSITION` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Chosen disposition. Values: ACCEPT_NETWORK, ACCEPT_RECORD, RAISE_WORKORDER, APPROVE_EXCEPTION',
  `DISPOSITION_BY_FK` bigint unsigned DEFAULT NULL COMMENT 'FK USER.ID: who decided; a system user for auto-resolution',
  `DISPOSITION_TIME` datetime(3) DEFAULT NULL COMMENT 'When decided (UTC)',
  `DISPOSITION_NOTE` varchar(500) DEFAULT NULL COMMENT 'Reason / note',
  `IS_AUTO_RESOLVED` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 when closed by policy without an engineer (touchless)',
  `EXCEPTION_EXPIRES_DATE` date DEFAULT NULL COMMENT 'Expiry of an approved exception; it reopens automatically after',
  `WORK_ORDER_REFERENCE` varchar(40) DEFAULT NULL COMMENT 'Work order raised (RAISE_WORKORDER)',
  `CLOSED_TIME` datetime(3) DEFAULT NULL COMMENT 'Closed (UTC); MTTR = closed - detected',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RECONCILIATION_EXCEPTION__CODE` (`CUSTOMER_ID`,`CODE`),
  KEY `IDX_RECONCILIATION_EXCEPTION__DISPOSITION_BY` (`CUSTOMER_ID`,`DISPOSITION_BY_FK`),
  KEY `IDX_RECONCILIATION_EXCEPTION__ASSIGNEE_ID` (`CUSTOMER_ID`,`ASSIGNEE_ID_FK`),
  KEY `IDX_RECONCILIATION_EXCEPTION__OWNER_TEAM_ID` (`CUSTOMER_ID`,`OWNER_TEAM_ID_FK`),
  KEY `IDX_RECONCILIATION_EXCEPTION__SCAN_TARGET_ID` (`CUSTOMER_ID`,`SCAN_TARGET_ID_FK`),
  KEY `IDX_RECONCILIATION_EXCEPTION__RESOURCE_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`),
  KEY `IDX_RECONCILIATION_EXCEPTION__RECONCILIATION_RESULT_ID` (`CUSTOMER_ID`,`RECONCILIATION_RESULT_ID_FK`),
  KEY `IDX_RECONCILIATION_EXCEPTION__RECONCILIATION_RULE_ID` (`CUSTOMER_ID`,`RECONCILIATION_RULE_ID_FK`),
  KEY `IDX_RECONCILIATION_EXCEPTION__DISCREPANCY_TYPE_ID` (`DISCREPANCY_TYPE_ID_FK`),
  KEY `IDX_RECONCILIATION_EXCEPTION__STATUS_SLA_DUE_TIME` (`CUSTOMER_ID`,`STATUS`,`SLA_DUE_TIME`),
  KEY `IDX_RECONCILIATION_EXCEPTION__DOMAIN_ID_STATE` (`CUSTOMER_ID`,`DOMAIN_ID_FK`,`STATE`),
  KEY `IDX_RECONCILIATION_EXCEPTION__DOMAIN_ID` (`DOMAIN_ID_FK`),
  CONSTRAINT `FK_RECONCILIATION_EXCEPTION__ASSIGNEE_ID` FOREIGN KEY (`CUSTOMER_ID`, `ASSIGNEE_ID_FK`) REFERENCES `USER` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RECONCILIATION_EXCEPTION__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RECONCILIATION_EXCEPTION__DISCREPANCY_TYPE_ID` FOREIGN KEY (`DISCREPANCY_TYPE_ID_FK`) REFERENCES `DISCREPANCY_TYPE` (`ID`),
  CONSTRAINT `FK_RECONCILIATION_EXCEPTION__DISPOSITION_BY` FOREIGN KEY (`CUSTOMER_ID`, `DISPOSITION_BY_FK`) REFERENCES `USER` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RECONCILIATION_EXCEPTION__DOMAIN_ID` FOREIGN KEY (`DOMAIN_ID_FK`) REFERENCES `DOMAIN` (`ID`),
  CONSTRAINT `FK_RECONCILIATION_EXCEPTION__OWNER_TEAM_ID` FOREIGN KEY (`CUSTOMER_ID`, `OWNER_TEAM_ID_FK`) REFERENCES `TEAM` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RECONCILIATION_EXCEPTION__RECONCILIATION_RESULT_ID` FOREIGN KEY (`CUSTOMER_ID`, `RECONCILIATION_RESULT_ID_FK`) REFERENCES `RECONCILIATION_RESULT` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RECONCILIATION_EXCEPTION__RECONCILIATION_RULE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RECONCILIATION_RULE_ID_FK`) REFERENCES `RECONCILIATION_RULE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RECONCILIATION_EXCEPTION__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RECONCILIATION_EXCEPTION__SCAN_TARGET_ID` FOREIGN KEY (`CUSTOMER_ID`, `SCAN_TARGET_ID_FK`) REFERENCES `SCAN_TARGET` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_RECONCILIATION_EXCEPTION__APPROVAL_EXPIRY` CHECK (((`DISPOSITION` <=> _utf8mb4'APPROVE_EXCEPTION') = (`EXCEPTION_EXPIRES_DATE` is not null))),
  CONSTRAINT `CK_RECONCILIATION_EXCEPTION__CLOSED` CHECK ((((`STATUS` in (_utf8mb4'RESOLVED',_utf8mb4'ACCEPTED_EXCEPTION')) = (`CLOSED_TIME` is not null)) and ((`CLOSED_TIME` is null) or (`CLOSED_TIME` >= `DETECTED_TIME`)))),
  CONSTRAINT `CK_RECONCILIATION_EXCEPTION__DISPOSED` CHECK ((((`DISPOSITION` is null) = (`DISPOSITION_TIME` is null)) and ((`DISPOSITION` is null) = (`DISPOSITION_BY_FK` is null)))),
  CONSTRAINT `CK_RECONCILIATION_EXCEPTION__DISPOSITION_VALUES` CHECK ((`DISPOSITION` in (_utf8mb4'ACCEPT_NETWORK',_utf8mb4'ACCEPT_RECORD',_utf8mb4'RAISE_WORKORDER',_utf8mb4'APPROVE_EXCEPTION'))),
  CONSTRAINT `CK_RECONCILIATION_EXCEPTION__SLA` CHECK (((`SLA_DUE_TIME` > `DETECTED_TIME`) and (`AFFECTED_RECORD_COUNT` >= 1))),
  CONSTRAINT `CK_RECONCILIATION_EXCEPTION__STATE_VALUES` CHECK ((`STATE` in (_utf8mb4'ROGUE',_utf8mb4'DRIFTED',_utf8mb4'MISSING',_utf8mb4'DUPLICATE',_utf8mb4'UNCLAIMED',_utf8mb4'NO_ADAPTER',_utf8mb4'ZOMBIE'))),
  CONSTRAINT `CK_RECONCILIATION_EXCEPTION__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'OPEN',_utf8mb4'IN_PROGRESS',_utf8mb4'RESOLVED',_utf8mb4'ACCEPTED_EXCEPTION'))),
  CONSTRAINT `CK_RECONCILIATION_EXCEPTION__SUBJECT` CHECK (((`RESOURCE_ID_FK` is not null) or (`SCAN_TARGET_ID_FK` is not null) or (`AFFECTED_RECORD_COUNT` > 1))),
  CONSTRAINT `CK_RECONCILIATION_EXCEPTION__WORK_ORDER` CHECK (((`DISPOSITION` <=> _utf8mb4'RAISE_WORKORDER') <= (`WORK_ORDER_REFERENCE` is not null)))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Discrepancy that needs a human (RX-5001): typed, owned, SLA-bound, closed by a disposition. One exception may cover many records (bulk). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RECONCILIATION_EXCEPTION`
--

LOCK TABLES `RECONCILIATION_EXCEPTION` WRITE;
/*!40000 ALTER TABLE `RECONCILIATION_EXCEPTION` DISABLE KEYS */;
INSERT INTO `RECONCILIATION_EXCEPTION` VALUES (1,1,'RX-5001','DRIFTED',2,1,1,1,23,NULL,'PCI 231 in record, 213 on air (BLR-277-S1-N78)',1,'2026-09-25 03:31:00.000','2026-09-27 03:31:00.000',1,5,'OPEN',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'2026-09-28 08:15:11.595',6,'2026-09-28 08:15:11.595',6,0),(2,1,'RX-5002','ROGUE',5,4,3,5,NULL,3,'10.20.7.99 (C9200L-24T) has no inventory record',1,'2026-09-25 00:31:00.000','2026-09-26 00:31:00.000',2,NULL,'OPEN',NULL,NULL,NULL,NULL,0,NULL,NULL,NULL,'2026-09-28 08:15:11.595',6,'2026-09-28 08:15:11.595',6,0),(3,1,'RX-5003','DRIFTED',6,4,2,6,7,NULL,'BLR-AGG-R07 runs 7.9.1, golden is 7.9.2',1,'2026-09-25 00:31:30.000','2026-09-28 00:31:30.000',2,3,'RESOLVED','RAISE_WORKORDER',3,'2026-09-25 09:15:00.000','Upgrade scheduled in maintenance window',0,NULL,'WO-78210','2026-09-25 09:15:00.000','2026-09-28 08:15:11.595',3,'2026-09-28 08:15:11.595',3,0);
/*!40000 ALTER TABLE `RECONCILIATION_EXCEPTION` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RECONCILIATION_FIELD`
--

DROP TABLE IF EXISTS `RECONCILIATION_FIELD`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RECONCILIATION_FIELD` (
  `CODE` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Field code',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'FK RESOURCE_TYPE.CODE the field belongs to; NULL = any type',
  `LABEL` varchar(64) NOT NULL COMMENT 'Display label (OS version, Azimuth)',
  `DATA_TYPE` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'STRING' COMMENT 'Value type. Values: STRING, NUMBER, BOOLEAN, DATE',
  PRIMARY KEY (`CODE`),
  KEY `IDX_RECONCILIATION_FIELD__RESOURCE_TYPE` (`RESOURCE_TYPE`),
  CONSTRAINT `FK_RECONCILIATION_FIELD__RESOURCE_TYPE` FOREIGN KEY (`RESOURCE_TYPE`) REFERENCES `RESOURCE_TYPE` (`CODE`),
  CONSTRAINT `CK_RECONCILIATION_FIELD__DATA_TYPE_VALUES` CHECK ((`DATA_TYPE` in (_utf8mb4'STRING',_utf8mb4'NUMBER',_utf8mb4'BOOLEAN',_utf8mb4'DATE')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Comparable resource attribute shared by provenance, rules and reconciliation results. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RECONCILIATION_FIELD`
--

LOCK TABLES `RECONCILIATION_FIELD` WRITE;
/*!40000 ALTER TABLE `RECONCILIATION_FIELD` DISABLE KEYS */;
INSERT INTO `RECONCILIATION_FIELD` VALUES ('ANTENNA_HEIGHT_M','ANTENNA','Antenna height','NUMBER'),('ARFCN_DOWNLINK','RADIO_CELL','Downlink ARFCN','NUMBER'),('AZIMUTH_DEG','ANTENNA','Azimuth','NUMBER'),('CELL_IDENTITY','RADIO_CELL','Cell identity','NUMBER'),('ELECTRICAL_TILT_DEG','ANTENNA','Electrical tilt','NUMBER'),('INSTANCE_UUID','VIRTUAL_NE','Instance UUID','STRING'),('LAC_TAC','RADIO_CELL','LAC / TAC','NUMBER'),('LINK_NEIGHBOR','LINK','Neighbour','STRING'),('MAC_ADDRESS','PHYSICAL_NE','MAC address','STRING'),('MANAGEMENT_IP','PHYSICAL_NE','Management IP','STRING'),('MECHANICAL_TILT_DEG','ANTENNA','Mechanical tilt','NUMBER'),('NETWORK_ELEMENT_NAME','PHYSICAL_NE','Device name','STRING'),('OPERATIONAL_STATUS',NULL,'Operational status','STRING'),('OS_VERSION','PHYSICAL_NE','OS version','STRING'),('PART_NUMBER','EQUIPMENT_COMPONENT','Part number','STRING'),('PHYSICAL_CELL_ID','RADIO_CELL','PCI / PSC / BSIC','NUMBER'),('PORT_ADMIN_STATUS','PORT','Admin status','STRING'),('PORT_SPEED','PORT','Port speed','NUMBER'),('PRODUCT_MODEL',NULL,'Model','STRING'),('RACK_POSITION','PHYSICAL_NE','Rack position','STRING'),('ROUTE_DISTINGUISHER','VRF','Route distinguisher','STRING'),('SERIAL_NUMBER',NULL,'Serial number','STRING'),('SERVICE_STATUS','SERVICE','Service status','STRING'),('SITE','PHYSICAL_NE','Site','STRING'),('SNMP_SYSTEM_OID','PHYSICAL_NE','sysObjectID','STRING'),('VENDOR','PHYSICAL_NE','Vendor','STRING'),('VLAN_NAME','VLAN','VLAN name','STRING');
/*!40000 ALTER TABLE `RECONCILIATION_FIELD` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RECONCILIATION_JOB`
--

DROP TABLE IF EXISTS `RECONCILIATION_JOB`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RECONCILIATION_JOB` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `CODE` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Job id',
  `DOMAIN_ID_FK` smallint unsigned NOT NULL COMMENT 'FK DOMAIN.ID: network domain (RAN, Core, Transport, Transport > IP/MPLS); one dimension shared by Discovery, Reconciliation and Inventory',
  `SOURCE_DESCRIPTION` varchar(150) NOT NULL COMMENT 'Source (Network Ã‚Â· SNMP v2c/v3)',
  `TARGET_DESCRIPTION` varchar(150) NOT NULL COMMENT 'Target (RAN asset register)',
  `SCAN_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Comparison type. Values: IDENTITY_ATTRIBUTE, ATTRIBUTE, IDENTITY, EXISTENCE, RELATIONSHIP',
  `CRON_EXPRESSION` varchar(64) DEFAULT NULL COMMENT 'Schedule; NULL = on demand',
  `SCHEDULE_STATE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'LIVE' COMMENT 'HELD while a rule is suspended. Values: LIVE, HELD, RETIRED',
  `NEXT_RUN_TIME` datetime(3) DEFAULT NULL COMMENT 'Next run (UTC)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  `IS_DELETED` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Soft-delete flag (0 = active, 1 = deleted)',
  `LIVE_FLAG` tinyint(1) GENERATED ALWAYS AS (if((`IS_DELETED` = 0),1,NULL)) STORED COMMENT '1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RECONCILIATION_JOB__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_RECONCILIATION_JOB__CODE` (`CUSTOMER_ID`,`CODE`,`LIVE_FLAG`),
  KEY `IDX_RECONCILIATION_JOB__DOMAIN_ID` (`DOMAIN_ID_FK`),
  CONSTRAINT `FK_RECONCILIATION_JOB__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RECONCILIATION_JOB__DOMAIN_ID` FOREIGN KEY (`DOMAIN_ID_FK`) REFERENCES `DOMAIN` (`ID`),
  CONSTRAINT `CK_RECONCILIATION_JOB__SCAN_TYPE_VALUES` CHECK ((`SCAN_TYPE` in (_utf8mb4'IDENTITY_ATTRIBUTE',_utf8mb4'ATTRIBUTE',_utf8mb4'IDENTITY',_utf8mb4'EXISTENCE',_utf8mb4'RELATIONSHIP'))),
  CONSTRAINT `CK_RECONCILIATION_JOB__SCHEDULE_STATE_VALUES` CHECK ((`SCHEDULE_STATE` in (_utf8mb4'LIVE',_utf8mb4'HELD',_utf8mb4'RETIRED')))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Reconciliation job (RCJ-RAN-01): compares a network source with an inventory target on a schedule, running a set of rules. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RECONCILIATION_JOB`
--

LOCK TABLES `RECONCILIATION_JOB` WRITE;
/*!40000 ALTER TABLE `RECONCILIATION_JOB` DISABLE KEYS */;
INSERT INTO `RECONCILIATION_JOB` (`ID`, `CUSTOMER_ID`, `CODE`, `DOMAIN_ID_FK`, `SOURCE_DESCRIPTION`, `TARGET_DESCRIPTION`, `SCAN_TYPE`, `CRON_EXPRESSION`, `SCHEDULE_STATE`, `NEXT_RUN_TIME`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`, `IS_DELETED`) VALUES (1,1,'RCJ-RAN-01',1,'ENM-RAN export','Inventory golden record','IDENTITY_ATTRIBUTE','30 3 * * *','LIVE','2026-09-26 03:30:00.000','2026-09-28 08:15:11.591',2,'2026-09-28 08:15:11.591',2,0,0),(2,1,'RCJ-IPM-01',4,'IP/MPLS collector results','Inventory golden record','IDENTITY_ATTRIBUTE','30 */6 * * *','LIVE','2026-09-25 06:30:00.000','2026-09-28 08:15:11.591',3,'2026-09-28 08:15:11.591',3,0,0);
/*!40000 ALTER TABLE `RECONCILIATION_JOB` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RECONCILIATION_JOB_RULE`
--

DROP TABLE IF EXISTS `RECONCILIATION_JOB_RULE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RECONCILIATION_JOB_RULE` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RECONCILIATION_JOB_ID_FK` int unsigned NOT NULL COMMENT 'FK RECONCILIATION_JOB.ID',
  `RECONCILIATION_RULE_ID_FK` int unsigned NOT NULL COMMENT 'FK RECONCILIATION_RULE.ID',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RECONCILIATION_JOB_RULE__RECON_JOB_ID_RECON_RULE_ID` (`CUSTOMER_ID`,`RECONCILIATION_JOB_ID_FK`,`RECONCILIATION_RULE_ID_FK`),
  KEY `IDX_RECONCILIATION_JOB_RULE__RECONCILIATION_RULE_ID` (`CUSTOMER_ID`,`RECONCILIATION_RULE_ID_FK`),
  CONSTRAINT `FK_RECONCILIATION_JOB_RULE__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RECONCILIATION_JOB_RULE__RECONCILIATION_JOB_ID` FOREIGN KEY (`CUSTOMER_ID`, `RECONCILIATION_JOB_ID_FK`) REFERENCES `RECONCILIATION_JOB` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `FK_RECONCILIATION_JOB_RULE__RECONCILIATION_RULE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RECONCILIATION_RULE_ID_FK`) REFERENCES `RECONCILIATION_RULE` (`CUSTOMER_ID`, `ID`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Rules a reconciliation job runs (many-to-many; was ruleIds[]). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RECONCILIATION_JOB_RULE`
--

LOCK TABLES `RECONCILIATION_JOB_RULE` WRITE;
/*!40000 ALTER TABLE `RECONCILIATION_JOB_RULE` DISABLE KEYS */;
INSERT INTO `RECONCILIATION_JOB_RULE` VALUES (1,1,1,1,'2026-09-28 08:15:11.592',2,'2026-09-28 08:15:11.592',2,0),(2,1,2,2,'2026-09-28 08:15:11.592',3,'2026-09-28 08:15:11.592',3,0),(3,1,2,3,'2026-09-28 08:15:11.592',3,'2026-09-28 08:15:11.592',3,0);
/*!40000 ALTER TABLE `RECONCILIATION_JOB_RULE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RECONCILIATION_RESULT`
--

DROP TABLE IF EXISTS `RECONCILIATION_RESULT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RECONCILIATION_RESULT` (
  `ID` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RECONCILIATION_RUN_ID_FK` int unsigned NOT NULL COMMENT 'FK RECONCILIATION_RUN.ID',
  `RECONCILIATION_RULE_ID_FK` int unsigned NOT NULL COMMENT 'FK RECONCILIATION_RULE.ID',
  `RESOURCE_ID_FK` bigint unsigned DEFAULT NULL COMMENT 'FK RESOURCE.ID: the inventory subject',
  `SCAN_TARGET_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK SCAN_TARGET.ID: network-only subject with no record (extra entity)',
  `SUBJECT_KIND` varchar(12) GENERATED ALWAYS AS (if((`RESOURCE_ID_FK` is null),_utf8mb4'SCAN_TARGET',_utf8mb4'RESOURCE')) STORED NOT NULL COMMENT 'Derived: RESOURCE or SCAN_TARGET',
  `SUBJECT_ID` bigint unsigned GENERATED ALWAYS AS (ifnull(`RESOURCE_ID_FK`,`SCAN_TARGET_ID_FK`)) STORED COMMENT 'Derived subject id; with SUBJECT_KIND makes the result unique per run and rule',
  `OUTCOME` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Outcome type; mapped to states in RECONCILIATION_STATE_MAP. Values: MATCHED, ATTRIBUTE_MISMATCH, EXTRA_NO_RECORD, RELATIONSHIP_DRIFT, MISSING_NO_LIVE_PEER, UNRESOLVED_MATCH, STALE, NOT_COMPARABLE',
  `MATCH_RULE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Identity rule used. Values: CHASSIS_SERIAL, CHASSIS_MAC, SYSNAME_AREA, MANAGEMENT_IP, EXTERNAL_ID, CELL_IDENTITY',
  `MATCH_CONFIDENCE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Match confidence. Values: EXACT, STRONG, WEAK',
  `VERIFIED_TIME` datetime(3) NOT NULL COMMENT 'When compared (UTC)',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RECONCILIATION_RESULT__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_RECONCILIATION_RESULT__RUN_RULE_SUBJECT` (`CUSTOMER_ID`,`SUBJECT_KIND`,`RECONCILIATION_RUN_ID_FK`,`RECONCILIATION_RULE_ID_FK`,`SUBJECT_ID`),
  KEY `IDX_RECONCILIATION_RESULT__RECONCILIATION_RUN_ID_FK` (`CUSTOMER_ID`,`RECONCILIATION_RUN_ID_FK`),
  KEY `IDX_RECONCILIATION_RESULT__RESOURCE_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`),
  KEY `IDX_RECONCILIATION_RESULT__SCAN_TARGET_ID` (`CUSTOMER_ID`,`SCAN_TARGET_ID_FK`),
  KEY `IDX_RECONCILIATION_RESULT__RECONCILIATION_RULE_ID` (`CUSTOMER_ID`,`RECONCILIATION_RULE_ID_FK`),
  KEY `IDX_RECONCILIATION_RESULT__OUTCOME_VERIFIED_TIME` (`CUSTOMER_ID`,`OUTCOME`,`VERIFIED_TIME`),
  CONSTRAINT `FK_RECONCILIATION_RESULT__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RECONCILIATION_RESULT__RECONCILIATION_RULE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RECONCILIATION_RULE_ID_FK`) REFERENCES `RECONCILIATION_RULE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RECONCILIATION_RESULT__RECONCILIATION_RUN_ID` FOREIGN KEY (`CUSTOMER_ID`, `RECONCILIATION_RUN_ID_FK`) REFERENCES `RECONCILIATION_RUN` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `FK_RECONCILIATION_RESULT__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RECONCILIATION_RESULT__SCAN_TARGET_ID` FOREIGN KEY (`CUSTOMER_ID`, `SCAN_TARGET_ID_FK`) REFERENCES `SCAN_TARGET` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_RECONCILIATION_RESULT__MATCH_CONFIDENCE_VALUES` CHECK ((`MATCH_CONFIDENCE` in (_utf8mb4'EXACT',_utf8mb4'STRONG',_utf8mb4'WEAK'))),
  CONSTRAINT `CK_RECONCILIATION_RESULT__MATCH_RULE_VALUES` CHECK ((`MATCH_RULE` in (_utf8mb4'CHASSIS_SERIAL',_utf8mb4'CHASSIS_MAC',_utf8mb4'SYSNAME_AREA',_utf8mb4'MANAGEMENT_IP',_utf8mb4'EXTERNAL_ID',_utf8mb4'CELL_IDENTITY'))),
  CONSTRAINT `CK_RECONCILIATION_RESULT__ONE_SUBJECT` CHECK (((`RESOURCE_ID_FK` is null) <> (`SCAN_TARGET_ID_FK` is null))),
  CONSTRAINT `CK_RECONCILIATION_RESULT__OUTCOME_VALUES` CHECK ((`OUTCOME` in (_utf8mb4'MATCHED',_utf8mb4'ATTRIBUTE_MISMATCH',_utf8mb4'EXTRA_NO_RECORD',_utf8mb4'RELATIONSHIP_DRIFT',_utf8mb4'MISSING_NO_LIVE_PEER',_utf8mb4'UNRESOLVED_MATCH',_utf8mb4'STALE',_utf8mb4'NOT_COMPARABLE')))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Outcome of one rule on one subject (any resource or a scan target) in one run. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RECONCILIATION_RESULT`
--

LOCK TABLES `RECONCILIATION_RESULT` WRITE;
/*!40000 ALTER TABLE `RECONCILIATION_RESULT` DISABLE KEYS */;
INSERT INTO `RECONCILIATION_RESULT` (`ID`, `CUSTOMER_ID`, `RECONCILIATION_RUN_ID_FK`, `RECONCILIATION_RULE_ID_FK`, `RESOURCE_ID_FK`, `SCAN_TARGET_ID_FK`, `OUTCOME`, `MATCH_RULE`, `MATCH_CONFIDENCE`, `VERIFIED_TIME`) VALUES (1,1,1,1,23,NULL,'ATTRIBUTE_MISMATCH','CELL_IDENTITY','EXACT','2026-09-25 03:31:00.000'),(2,1,1,1,24,NULL,'MATCHED','CELL_IDENTITY','EXACT','2026-09-25 03:31:00.000'),(3,1,2,3,7,NULL,'MATCHED','CHASSIS_SERIAL','EXACT','2026-09-25 00:31:00.000'),(4,1,2,3,8,NULL,'MATCHED','CHASSIS_MAC','STRONG','2026-09-25 00:31:00.000'),(5,1,2,3,NULL,3,'EXTRA_NO_RECORD',NULL,NULL,'2026-09-25 00:31:00.000'),(6,1,2,2,7,NULL,'ATTRIBUTE_MISMATCH','CHASSIS_SERIAL','EXACT','2026-09-25 00:31:30.000');
/*!40000 ALTER TABLE `RECONCILIATION_RESULT` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RECONCILIATION_RESULT_FIELD`
--

DROP TABLE IF EXISTS `RECONCILIATION_RESULT_FIELD`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RECONCILIATION_RESULT_FIELD` (
  `ID` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RECONCILIATION_RESULT_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RECONCILIATION_RESULT.ID',
  `FIELD_CODE` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'FK RECONCILIATION_FIELD.CODE (OS_VERSION, AZIMUTH_DEG ...)',
  `INVENTORY_VALUE` varchar(255) DEFAULT NULL COMMENT 'Value in the record',
  `NETWORK_VALUE` varchar(255) DEFAULT NULL COMMENT 'Value discovered',
  `EVIDENCE_SOURCE` varchar(100) DEFAULT NULL COMMENT 'Evidence (sysObjectID .2636, chassis inventory, LLDP neighbour set)',
  `IS_MATCH` tinyint(1) NOT NULL COMMENT '1 when the two values agree',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RECONCILIATION_RESULT_FIELD__RECON_RESULT_ID_FIELD_CODE` (`CUSTOMER_ID`,`RECONCILIATION_RESULT_ID_FK`,`FIELD_CODE`),
  KEY `IDX_RECONCILIATION_RESULT_FIELD__FIELD_CODE` (`FIELD_CODE`),
  CONSTRAINT `FK_RECONCILIATION_RESULT_FIELD__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RECONCILIATION_RESULT_FIELD__FIELD_CODE` FOREIGN KEY (`FIELD_CODE`) REFERENCES `RECONCILIATION_FIELD` (`CODE`),
  CONSTRAINT `FK_RECONCILIATION_RESULT_FIELD__RECONCILIATION_RESULT_ID` FOREIGN KEY (`CUSTOMER_ID`, `RECONCILIATION_RESULT_ID_FK`) REFERENCES `RECONCILIATION_RESULT` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='One compared field: inventory value vs network value, evidence source and confidence (attribute drift detail). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RECONCILIATION_RESULT_FIELD`
--

LOCK TABLES `RECONCILIATION_RESULT_FIELD` WRITE;
/*!40000 ALTER TABLE `RECONCILIATION_RESULT_FIELD` DISABLE KEYS */;
INSERT INTO `RECONCILIATION_RESULT_FIELD` VALUES (1,1,1,'PHYSICAL_CELL_ID','231','213','ENM-RAN export 2026-09-25',0,'2026-09-28 08:15:11.595',6,'2026-09-28 08:15:11.595',6,0),(2,1,2,'PHYSICAL_CELL_ID','214','214','ENM-RAN export 2026-09-25',1,'2026-09-28 08:15:11.595',6,'2026-09-28 08:15:11.595',6,0),(3,1,6,'OS_VERSION','7.9.2','7.9.1','SNMP sysDescr 2026-09-25',0,'2026-09-28 08:15:11.595',6,'2026-09-28 08:15:11.595',6,0);
/*!40000 ALTER TABLE `RECONCILIATION_RESULT_FIELD` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RECONCILIATION_RULE`
--

DROP TABLE IF EXISTS `RECONCILIATION_RULE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RECONCILIATION_RULE` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `CODE` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Rule id RUL-<RAN|COR|TRA|IPM>-NNN',
  `NAME` varchar(150) NOT NULL COMMENT 'Rule name',
  `DESCRIPTION` varchar(1000) NOT NULL COMMENT 'What the rule checks',
  `DOMAIN_ID_FK` smallint unsigned NOT NULL COMMENT 'FK DOMAIN.ID: network domain (RAN, Core, Transport, Transport > IP/MPLS); one dimension shared by Discovery, Reconciliation and Inventory',
  `SOURCE_DESCRIPTION` varchar(150) NOT NULL COMMENT 'Source side (Network Ã‚Â· SNMP v2c + NETCONF)',
  `TARGET_DESCRIPTION` varchar(150) NOT NULL COMMENT 'Target side (Inventory Ã‚Â· RAN asset register)',
  `RULE_TYPE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'What kind of comparison. Values: IDENTITY, ATTRIBUTE, EXISTENCE, RELATIONSHIP, FRESHNESS',
  `PRIORITY` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'MEDIUM' COMMENT 'Priority. Values: HIGH, MEDIUM, LOW',
  `STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'DRAFT' COMMENT 'Lifecycle status; allowed moves in RECONCILIATION_RULE_TRANSITION; runs only when ACTIVE or EXECUTING. Values: DRAFT, REVIEW, APPROVED, ACTIVE, EXECUTING, SUSPENDED, RETIRED',
  `ORIGIN` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'MANUAL' COMMENT 'How the rule was created. Values: MANUAL, AUTO_GENERATED, AI_SUGGESTED',
  `OWNER_ID_FK` bigint unsigned NOT NULL COMMENT 'FK USER.ID: owner',
  `REVIEWER_ID_FK` bigint unsigned NOT NULL COMMENT 'FK USER.ID: reviewer',
  `APPROVER_ID_FK` bigint unsigned NOT NULL COMMENT 'FK USER.ID: approver',
  `EXECUTOR_ID_FK` bigint unsigned NOT NULL COMMENT 'FK USER.ID: executor',
  `EXCEPTION_REVIEWER_TEAM_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK TEAM.ID: team that reviews the exceptions it raises',
  `EXPECTED_IMPACT` varchar(500) DEFAULT NULL COMMENT 'Expected impact statement for review',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  `IS_DELETED` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Soft-delete flag (0 = active, 1 = deleted)',
  `LIVE_FLAG` tinyint(1) GENERATED ALWAYS AS (if((`IS_DELETED` = 0),1,NULL)) STORED COMMENT '1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RECONCILIATION_RULE__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_RECONCILIATION_RULE__CODE` (`CUSTOMER_ID`,`CODE`,`LIVE_FLAG`),
  KEY `IDX_RECONCILIATION_RULE__EXCEPTION_REVIEWER_TEAM_ID` (`CUSTOMER_ID`,`EXCEPTION_REVIEWER_TEAM_ID_FK`),
  KEY `IDX_RECONCILIATION_RULE__EXECUTOR_ID` (`CUSTOMER_ID`,`EXECUTOR_ID_FK`),
  KEY `IDX_RECONCILIATION_RULE__APPROVER_ID` (`CUSTOMER_ID`,`APPROVER_ID_FK`),
  KEY `IDX_RECONCILIATION_RULE__REVIEWER_ID` (`CUSTOMER_ID`,`REVIEWER_ID_FK`),
  KEY `IDX_RECONCILIATION_RULE__OWNER_ID` (`CUSTOMER_ID`,`OWNER_ID_FK`),
  KEY `IDX_RECONCILIATION_RULE__DOMAIN_ID_STATUS` (`CUSTOMER_ID`,`DOMAIN_ID_FK`,`STATUS`),
  KEY `IDX_RECONCILIATION_RULE__DOMAIN_ID` (`DOMAIN_ID_FK`),
  CONSTRAINT `FK_RECONCILIATION_RULE__APPROVER_ID` FOREIGN KEY (`CUSTOMER_ID`, `APPROVER_ID_FK`) REFERENCES `USER` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RECONCILIATION_RULE__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RECONCILIATION_RULE__DOMAIN_ID` FOREIGN KEY (`DOMAIN_ID_FK`) REFERENCES `DOMAIN` (`ID`),
  CONSTRAINT `FK_RECONCILIATION_RULE__EXCEPTION_REVIEWER_TEAM_ID` FOREIGN KEY (`CUSTOMER_ID`, `EXCEPTION_REVIEWER_TEAM_ID_FK`) REFERENCES `TEAM` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RECONCILIATION_RULE__EXECUTOR_ID` FOREIGN KEY (`CUSTOMER_ID`, `EXECUTOR_ID_FK`) REFERENCES `USER` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RECONCILIATION_RULE__OWNER_ID` FOREIGN KEY (`CUSTOMER_ID`, `OWNER_ID_FK`) REFERENCES `USER` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RECONCILIATION_RULE__REVIEWER_ID` FOREIGN KEY (`CUSTOMER_ID`, `REVIEWER_ID_FK`) REFERENCES `USER` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_RECONCILIATION_RULE__ORIGIN_VALUES` CHECK ((`ORIGIN` in (_utf8mb4'MANUAL',_utf8mb4'AUTO_GENERATED',_utf8mb4'AI_SUGGESTED'))),
  CONSTRAINT `CK_RECONCILIATION_RULE__PRIORITY_VALUES` CHECK ((`PRIORITY` in (_utf8mb4'HIGH',_utf8mb4'MEDIUM',_utf8mb4'LOW'))),
  CONSTRAINT `CK_RECONCILIATION_RULE__RULE_TYPE_VALUES` CHECK ((`RULE_TYPE` in (_utf8mb4'IDENTITY',_utf8mb4'ATTRIBUTE',_utf8mb4'EXISTENCE',_utf8mb4'RELATIONSHIP',_utf8mb4'FRESHNESS'))),
  CONSTRAINT `CK_RECONCILIATION_RULE__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'DRAFT',_utf8mb4'REVIEW',_utf8mb4'APPROVED',_utf8mb4'ACTIVE',_utf8mb4'EXECUTING',_utf8mb4'SUSPENDED',_utf8mb4'RETIRED')))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Reconciliation rule (RUL-RAN-001) with owners for each lifecycle role. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RECONCILIATION_RULE`
--

LOCK TABLES `RECONCILIATION_RULE` WRITE;
/*!40000 ALTER TABLE `RECONCILIATION_RULE` DISABLE KEYS */;
INSERT INTO `RECONCILIATION_RULE` (`ID`, `CUSTOMER_ID`, `CODE`, `NAME`, `DESCRIPTION`, `DOMAIN_ID_FK`, `SOURCE_DESCRIPTION`, `TARGET_DESCRIPTION`, `RULE_TYPE`, `PRIORITY`, `STATUS`, `ORIGIN`, `OWNER_ID_FK`, `REVIEWER_ID_FK`, `APPROVER_ID_FK`, `EXECUTOR_ID_FK`, `EXCEPTION_REVIEWER_TEAM_ID_FK`, `EXPECTED_IMPACT`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`, `IS_DELETED`) VALUES (1,1,'RUL-RAN-001','Cell PCI matches planning record','Compares the physical cell id exported by the EMS with the inventory record for every on-air NR cell.',1,'EMS (ENM-RAN)','Inventory golden record','ATTRIBUTE','HIGH','ACTIVE','MANUAL',2,3,4,1,1,'~120 cells per run','2026-09-28 08:15:11.586',2,'2026-09-28 08:15:11.586',2,0,0),(2,1,'RUL-IPM-001','Router OS matches golden version','Flags routers whose running OS differs from the product model policy.',4,'Collector (SNMP)','PRODUCT_MODEL_POLICY','ATTRIBUTE','MEDIUM','REVIEW','MANUAL',3,2,4,1,2,'~40 routers per run','2026-09-28 08:15:11.586',3,'2026-09-28 08:15:11.586',3,0,0),(3,1,'RUL-IPM-002','Discovered device has an inventory record','Every responding scan target must resolve to a NETWORK_ELEMENT by serial, MAC or management IP.',4,'Collector (SNMP)','Inventory golden record','EXISTENCE','HIGH','ACTIVE','MANUAL',3,2,4,1,2,'all IP/MPLS targets','2026-09-28 08:15:11.586',3,'2026-09-28 08:15:11.586',3,0,0),(4,1,'RUL-OPT-001','Optical node seen within 30 days','Raises a freshness exception when an optical node has not been reported by TL1 discovery for 30 days.',5,'Collector (TL1)','Inventory golden record','FRESHNESS','LOW','DRAFT','MANUAL',3,2,4,1,2,NULL,'2026-09-28 08:15:11.586',3,'2026-09-28 08:15:11.586',3,0,0);
/*!40000 ALTER TABLE `RECONCILIATION_RULE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RECONCILIATION_RULE_CONDITION`
--

DROP TABLE IF EXISTS `RECONCILIATION_RULE_CONDITION`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RECONCILIATION_RULE_CONDITION` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RECONCILIATION_RULE_ID_FK` int unsigned NOT NULL COMMENT 'FK RECONCILIATION_RULE.ID',
  `SEQUENCE_NUMBER` smallint unsigned NOT NULL COMMENT 'Order',
  `CONDITION_CONNECTOR` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Join with the previous condition; NULL on the first. Values: AND, OR',
  `SOURCE_FIELD_CODE` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'FK RECONCILIATION_FIELD.CODE: field tested',
  `OPERATOR` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Operator. Values: EQUALS, NOT_EQUALS, CONTAINS, GREATER_THAN, LESS_THAN, GREATER_OR_EQUAL, LESS_OR_EQUAL',
  `TARGET_KIND` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Whether the comparison is against a field or a literal. Values: FIELD, LITERAL',
  `TARGET_FIELD_CODE` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'FK RECONCILIATION_FIELD.CODE when TARGET_KIND = FIELD',
  `TARGET_LITERAL` varchar(150) DEFAULT NULL COMMENT 'Literal when TARGET_KIND = LITERAL (Decommissioned, true, null)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RECONCILIATION_RULE_CONDITION__RECON_RULE_ID_SEQUENCE_NUMBER` (`CUSTOMER_ID`,`RECONCILIATION_RULE_ID_FK`,`SEQUENCE_NUMBER`),
  KEY `IDX_RECONCILIATION_RULE_CONDITION__SOURCE_FIELD_CODE` (`SOURCE_FIELD_CODE`),
  KEY `IDX_RECONCILIATION_RULE_CONDITION__TARGET_FIELD_CODE` (`TARGET_FIELD_CODE`),
  CONSTRAINT `FK_RECONCILIATION_RULE_CONDITION__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RECONCILIATION_RULE_CONDITION__RECONCILIATION_RULE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RECONCILIATION_RULE_ID_FK`) REFERENCES `RECONCILIATION_RULE` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `FK_RECONCILIATION_RULE_CONDITION__SOURCE_FIELD_CODE` FOREIGN KEY (`SOURCE_FIELD_CODE`) REFERENCES `RECONCILIATION_FIELD` (`CODE`),
  CONSTRAINT `FK_RECONCILIATION_RULE_CONDITION__TARGET_FIELD_CODE` FOREIGN KEY (`TARGET_FIELD_CODE`) REFERENCES `RECONCILIATION_FIELD` (`CODE`),
  CONSTRAINT `CK_RECONCILIATION_RULE_CONDITION__CONDITION_CONNECTOR_VALUES` CHECK ((`CONDITION_CONNECTOR` in (_utf8mb4'AND',_utf8mb4'OR'))),
  CONSTRAINT `CK_RECONCILIATION_RULE_CONDITION__CONNECTOR` CHECK (((`SEQUENCE_NUMBER` = 1) = (`CONDITION_CONNECTOR` is null))),
  CONSTRAINT `CK_RECONCILIATION_RULE_CONDITION__OPERATOR_VALUES` CHECK ((`OPERATOR` in (_utf8mb4'EQUALS',_utf8mb4'NOT_EQUALS',_utf8mb4'CONTAINS',_utf8mb4'GREATER_THAN',_utf8mb4'LESS_THAN',_utf8mb4'GREATER_OR_EQUAL',_utf8mb4'LESS_OR_EQUAL'))),
  CONSTRAINT `CK_RECONCILIATION_RULE_CONDITION__TARGET` CHECK ((((`TARGET_KIND` = _utf8mb4'FIELD') = (`TARGET_FIELD_CODE` is not null)) and ((`TARGET_KIND` = _utf8mb4'LITERAL') = (`TARGET_LITERAL` is not null)))),
  CONSTRAINT `CK_RECONCILIATION_RULE_CONDITION__TARGET_KIND_VALUES` CHECK ((`TARGET_KIND` in (_utf8mb4'FIELD',_utf8mb4'LITERAL')))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Condition of a rule: source field, operator, target field or literal, joined by AND / OR. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RECONCILIATION_RULE_CONDITION`
--

LOCK TABLES `RECONCILIATION_RULE_CONDITION` WRITE;
/*!40000 ALTER TABLE `RECONCILIATION_RULE_CONDITION` DISABLE KEYS */;
INSERT INTO `RECONCILIATION_RULE_CONDITION` VALUES (1,1,1,1,NULL,'PHYSICAL_CELL_ID','EQUALS','FIELD','PHYSICAL_CELL_ID',NULL,'2026-09-28 08:15:11.589',2,'2026-09-28 08:15:11.589',2,0),(2,1,1,2,'AND','OPERATIONAL_STATUS','EQUALS','LITERAL',NULL,'ON_AIR','2026-09-28 08:15:11.589',2,'2026-09-28 08:15:11.589',2,0),(3,1,2,1,NULL,'OS_VERSION','EQUALS','FIELD','OS_VERSION',NULL,'2026-09-28 08:15:11.589',3,'2026-09-28 08:15:11.589',3,0),(4,1,3,1,NULL,'SERIAL_NUMBER','EQUALS','FIELD','SERIAL_NUMBER',NULL,'2026-09-28 08:15:11.589',3,'2026-09-28 08:15:11.589',3,0),(5,1,3,2,'OR','MAC_ADDRESS','EQUALS','FIELD','MAC_ADDRESS',NULL,'2026-09-28 08:15:11.589',3,'2026-09-28 08:15:11.589',3,0),(6,1,3,3,'OR','MANAGEMENT_IP','EQUALS','FIELD','MANAGEMENT_IP',NULL,'2026-09-28 08:15:11.589',3,'2026-09-28 08:15:11.589',3,0);
/*!40000 ALTER TABLE `RECONCILIATION_RULE_CONDITION` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RECONCILIATION_RULE_EVENT`
--

DROP TABLE IF EXISTS `RECONCILIATION_RULE_EVENT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RECONCILIATION_RULE_EVENT` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RECONCILIATION_RULE_ID_FK` int unsigned NOT NULL COMMENT 'FK RECONCILIATION_RULE.ID',
  `FROM_STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Status before. Values: DRAFT, REVIEW, APPROVED, ACTIVE, EXECUTING, SUSPENDED, RETIRED',
  `TO_STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Status after. Values: DRAFT, REVIEW, APPROVED, ACTIVE, EXECUTING, SUSPENDED, RETIRED',
  `ACTION` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Action taken. Values: SUBMIT_FOR_REVIEW, APPROVE, REJECT, REQUEST_CHANGES, ACTIVATE, START_EXECUTION, FINISH_EXECUTION, SUSPEND, RESUME, RETIRE',
  `ACTOR_ID_FK` bigint unsigned NOT NULL COMMENT 'FK USER.ID: who acted (not always the reviewer)',
  `EVENT_TIME` datetime(3) NOT NULL COMMENT 'When (UTC)',
  `NOTE` varchar(500) DEFAULT NULL COMMENT 'Note (Sent back to the owner; TL1 credential expired)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RECONCILIATION_RULE_EVENT__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  KEY `IDX_RECONCILIATION_RULE_EVENT__FROM_STATUS_TO_STATUS_ACTION` (`FROM_STATUS`,`TO_STATUS`,`ACTION`),
  KEY `IDX_RECONCILIATION_RULE_EVENT__ACTOR_ID` (`CUSTOMER_ID`,`ACTOR_ID_FK`),
  KEY `IDX_RECONCILIATION_RULE_EVENT__RECONCILIATION_RULE_ID_EVENT_TIME` (`CUSTOMER_ID`,`RECONCILIATION_RULE_ID_FK`,`EVENT_TIME`),
  CONSTRAINT `FK_RECONCILIATION_RULE_EVENT__ACTOR_ID` FOREIGN KEY (`CUSTOMER_ID`, `ACTOR_ID_FK`) REFERENCES `USER` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RECONCILIATION_RULE_EVENT__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RECONCILIATION_RULE_EVENT__FROM_STATUS_TO_STATUS_ACTION` FOREIGN KEY (`FROM_STATUS`, `TO_STATUS`, `ACTION`) REFERENCES `RECONCILIATION_RULE_TRANSITION` (`FROM_STATUS`, `TO_STATUS`, `ACTION`),
  CONSTRAINT `FK_RECONCILIATION_RULE_EVENT__RECONCILIATION_RULE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RECONCILIATION_RULE_ID_FK`) REFERENCES `RECONCILIATION_RULE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_RECONCILIATION_RULE_EVENT__NOTE` CHECK (((`ACTION` not in (_utf8mb4'REJECT',_utf8mb4'REQUEST_CHANGES',_utf8mb4'SUSPEND',_utf8mb4'RETIRE')) or (`NOTE` is not null)))
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Append-only approval / lifecycle trail of a rule (the application never updates or deletes rows); the FK to RECONCILIATION_RULE_TRANSITION rejects illegal moves. Records the real acting user. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RECONCILIATION_RULE_EVENT`
--

LOCK TABLES `RECONCILIATION_RULE_EVENT` WRITE;
/*!40000 ALTER TABLE `RECONCILIATION_RULE_EVENT` DISABLE KEYS */;
INSERT INTO `RECONCILIATION_RULE_EVENT` VALUES (1,1,1,'DRAFT','REVIEW','SUBMIT_FOR_REVIEW',2,'2026-08-01 10:00:00.000',NULL,'2026-09-28 08:15:11.590',2,'2026-09-28 08:15:11.590',2,0),(2,1,1,'REVIEW','APPROVED','APPROVE',4,'2026-08-03 15:30:00.000','Approved for South region','2026-09-28 08:15:11.590',4,'2026-09-28 08:15:11.590',4,0),(3,1,1,'APPROVED','ACTIVE','ACTIVATE',2,'2026-08-04 09:00:00.000',NULL,'2026-09-28 08:15:11.590',2,'2026-09-28 08:15:11.590',2,0),(4,1,2,'DRAFT','REVIEW','SUBMIT_FOR_REVIEW',3,'2026-09-20 11:00:00.000',NULL,'2026-09-28 08:15:11.590',3,'2026-09-28 08:15:11.590',3,0),(5,1,3,'DRAFT','REVIEW','SUBMIT_FOR_REVIEW',3,'2026-07-10 10:00:00.000',NULL,'2026-09-28 08:15:11.590',3,'2026-09-28 08:15:11.590',3,0),(6,1,3,'REVIEW','DRAFT','REQUEST_CHANGES',2,'2026-07-11 10:00:00.000','Add management IP as fallback','2026-09-28 08:15:11.590',2,'2026-09-28 08:15:11.590',2,0),(7,1,3,'DRAFT','REVIEW','SUBMIT_FOR_REVIEW',3,'2026-07-12 10:00:00.000',NULL,'2026-09-28 08:15:11.590',3,'2026-09-28 08:15:11.590',3,0),(8,1,3,'REVIEW','APPROVED','APPROVE',4,'2026-07-14 10:00:00.000',NULL,'2026-09-28 08:15:11.590',4,'2026-09-28 08:15:11.590',4,0),(9,1,3,'APPROVED','ACTIVE','ACTIVATE',3,'2026-07-15 08:00:00.000',NULL,'2026-09-28 08:15:11.590',3,'2026-09-28 08:15:11.590',3,0);
/*!40000 ALTER TABLE `RECONCILIATION_RULE_EVENT` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RECONCILIATION_RULE_TRANSITION`
--

DROP TABLE IF EXISTS `RECONCILIATION_RULE_TRANSITION`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RECONCILIATION_RULE_TRANSITION` (
  `ID` smallint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK (metadata table)',
  `FROM_STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Status before. Values: DRAFT, REVIEW, APPROVED, ACTIVE, EXECUTING, SUSPENDED, RETIRED',
  `TO_STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Status after. Values: DRAFT, REVIEW, APPROVED, ACTIVE, EXECUTING, SUSPENDED, RETIRED',
  `ACTION` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Action that performs the move. Values: SUBMIT_FOR_REVIEW, APPROVE, REJECT, REQUEST_CHANGES, ACTIVATE, START_EXECUTION, FINISH_EXECUTION, SUSPEND, RESUME, RETIRE',
  `ACTOR_ROLE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Role responsible for the action (next-action banner). Values: OWNER, REVIEWER, APPROVER, EXECUTOR, SYSTEM',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RECONCILIATION_RULE_TRANSITION__FROM_STATUS_TO_STATUS_ACTION` (`FROM_STATUS`,`TO_STATUS`,`ACTION`),
  CONSTRAINT `CK_RECONCILIATION_RULE_TRANSITION__ACTION_VALUES` CHECK ((`ACTION` in (_utf8mb4'SUBMIT_FOR_REVIEW',_utf8mb4'APPROVE',_utf8mb4'REJECT',_utf8mb4'REQUEST_CHANGES',_utf8mb4'ACTIVATE',_utf8mb4'START_EXECUTION',_utf8mb4'FINISH_EXECUTION',_utf8mb4'SUSPEND',_utf8mb4'RESUME',_utf8mb4'RETIRE'))),
  CONSTRAINT `CK_RECONCILIATION_RULE_TRANSITION__ACTOR_ROLE_VALUES` CHECK ((`ACTOR_ROLE` in (_utf8mb4'OWNER',_utf8mb4'REVIEWER',_utf8mb4'APPROVER',_utf8mb4'EXECUTOR',_utf8mb4'SYSTEM'))),
  CONSTRAINT `CK_RECONCILIATION_RULE_TRANSITION__FROM_STATUS_VALUES` CHECK ((`FROM_STATUS` in (_utf8mb4'DRAFT',_utf8mb4'REVIEW',_utf8mb4'APPROVED',_utf8mb4'ACTIVE',_utf8mb4'EXECUTING',_utf8mb4'SUSPENDED',_utf8mb4'RETIRED'))),
  CONSTRAINT `CK_RECONCILIATION_RULE_TRANSITION__TO_STATUS_VALUES` CHECK ((`TO_STATUS` in (_utf8mb4'DRAFT',_utf8mb4'REVIEW',_utf8mb4'APPROVED',_utf8mb4'ACTIVE',_utf8mb4'EXECUTING',_utf8mb4'SUSPENDED',_utf8mb4'RETIRED')))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Allowed rule lifecycle moves and the action that makes them. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RECONCILIATION_RULE_TRANSITION`
--

LOCK TABLES `RECONCILIATION_RULE_TRANSITION` WRITE;
/*!40000 ALTER TABLE `RECONCILIATION_RULE_TRANSITION` DISABLE KEYS */;
INSERT INTO `RECONCILIATION_RULE_TRANSITION` VALUES (1,'DRAFT','REVIEW','SUBMIT_FOR_REVIEW','OWNER'),(2,'REVIEW','APPROVED','APPROVE','APPROVER'),(3,'REVIEW','DRAFT','REJECT','APPROVER'),(4,'REVIEW','DRAFT','REQUEST_CHANGES','REVIEWER'),(5,'APPROVED','ACTIVE','ACTIVATE','OWNER'),(6,'ACTIVE','EXECUTING','START_EXECUTION','SYSTEM'),(7,'EXECUTING','ACTIVE','FINISH_EXECUTION','SYSTEM'),(8,'ACTIVE','SUSPENDED','SUSPEND','OWNER'),(9,'SUSPENDED','ACTIVE','RESUME','OWNER'),(10,'ACTIVE','RETIRED','RETIRE','OWNER'),(11,'SUSPENDED','RETIRED','RETIRE','OWNER'),(12,'DRAFT','RETIRED','RETIRE','OWNER');
/*!40000 ALTER TABLE `RECONCILIATION_RULE_TRANSITION` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RECONCILIATION_RUN`
--

DROP TABLE IF EXISTS `RECONCILIATION_RUN`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RECONCILIATION_RUN` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RECONCILIATION_JOB_ID_FK` int unsigned NOT NULL COMMENT 'FK RECONCILIATION_JOB.ID',
  `SCAN_RUN_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK SCAN_RUN.ID: discovery run whose facts were compared',
  `STATUS` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'SCHEDULED' COMMENT 'Run state. Values: SCHEDULED, RUNNING, COMPLETED, COMPLETED_WITH_ERRORS, FAILED',
  `STARTED_TIME` datetime(3) DEFAULT NULL COMMENT 'Start (UTC)',
  `ENDED_TIME` datetime(3) DEFAULT NULL COMMENT 'End (UTC)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RECONCILIATION_RUN__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  KEY `IDX_RECONCILIATION_RUN__SCAN_RUN_ID` (`CUSTOMER_ID`,`SCAN_RUN_ID_FK`),
  KEY `IDX_RECONCILIATION_RUN__RECONCILIATION_JOB_ID_FK` (`CUSTOMER_ID`,`RECONCILIATION_JOB_ID_FK`),
  KEY `IDX_RECONCILIATION_RUN__RECONCILIATION_JOB_ID_STARTED_TIME` (`CUSTOMER_ID`,`RECONCILIATION_JOB_ID_FK`,`STARTED_TIME`),
  CONSTRAINT `FK_RECONCILIATION_RUN__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RECONCILIATION_RUN__RECONCILIATION_JOB_ID` FOREIGN KEY (`CUSTOMER_ID`, `RECONCILIATION_JOB_ID_FK`) REFERENCES `RECONCILIATION_JOB` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RECONCILIATION_RUN__SCAN_RUN_ID` FOREIGN KEY (`CUSTOMER_ID`, `SCAN_RUN_ID_FK`) REFERENCES `SCAN_RUN` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_RECONCILIATION_RUN__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'SCHEDULED',_utf8mb4'RUNNING',_utf8mb4'COMPLETED',_utf8mb4'COMPLETED_WITH_ERRORS',_utf8mb4'FAILED'))),
  CONSTRAINT `CK_RECONCILIATION_RUN__TIMES` CHECK (((`ENDED_TIME` is null) or ((`STARTED_TIME` is not null) and (`ENDED_TIME` >= `STARTED_TIME`))))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='One execution of a reconciliation job (a reconciliation cycle). Scanned / drifted / auto-resolved figures are derived from results and exceptions. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RECONCILIATION_RUN`
--

LOCK TABLES `RECONCILIATION_RUN` WRITE;
/*!40000 ALTER TABLE `RECONCILIATION_RUN` DISABLE KEYS */;
INSERT INTO `RECONCILIATION_RUN` VALUES (1,1,1,2,'COMPLETED','2026-09-25 03:30:00.000','2026-09-25 03:31:48.000','2026-09-28 08:15:11.592',6,'2026-09-28 08:15:11.592',6,0),(2,1,2,1,'COMPLETED_WITH_ERRORS','2026-09-25 00:30:00.000','2026-09-25 00:33:10.000','2026-09-28 08:15:11.592',6,'2026-09-28 08:15:11.592',6,0);
/*!40000 ALTER TABLE `RECONCILIATION_RUN` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RECONCILIATION_RUN_RULE`
--

DROP TABLE IF EXISTS `RECONCILIATION_RUN_RULE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RECONCILIATION_RUN_RULE` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RECONCILIATION_RUN_ID_FK` int unsigned NOT NULL COMMENT 'FK RECONCILIATION_RUN.ID',
  `RECONCILIATION_RULE_ID_FK` int unsigned NOT NULL COMMENT 'FK RECONCILIATION_RULE.ID',
  `MATCHED_COUNT` int unsigned NOT NULL COMMENT 'Elements that matched',
  `EXCEPTION_COUNT` int unsigned NOT NULL COMMENT 'Exceptions raised',
  `DURATION_MS` int unsigned NOT NULL COMMENT 'Rule duration, ms',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RECONCILIATION_RUN_RULE__RECON_RUN_ID_RECON_RULE_ID` (`CUSTOMER_ID`,`RECONCILIATION_RUN_ID_FK`,`RECONCILIATION_RULE_ID_FK`),
  KEY `IDX_RECONCILIATION_RUN_RULE__RECONCILIATION_RULE_ID` (`CUSTOMER_ID`,`RECONCILIATION_RULE_ID_FK`),
  CONSTRAINT `FK_RECONCILIATION_RUN_RULE__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RECONCILIATION_RUN_RULE__RECONCILIATION_RULE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RECONCILIATION_RULE_ID_FK`) REFERENCES `RECONCILIATION_RULE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RECONCILIATION_RUN_RULE__RECONCILIATION_RUN_ID` FOREIGN KEY (`CUSTOMER_ID`, `RECONCILIATION_RUN_ID_FK`) REFERENCES `RECONCILIATION_RUN` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Execution of one rule inside a run (Rule Details > Execution: matched, exceptions, duration). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RECONCILIATION_RUN_RULE`
--

LOCK TABLES `RECONCILIATION_RUN_RULE` WRITE;
/*!40000 ALTER TABLE `RECONCILIATION_RUN_RULE` DISABLE KEYS */;
INSERT INTO `RECONCILIATION_RUN_RULE` VALUES (1,1,1,1,1,1,1810,'2026-09-28 08:15:11.593',6,'2026-09-28 08:15:11.593',6,0),(2,1,2,2,1,1,640,'2026-09-28 08:15:11.593',6,'2026-09-28 08:15:11.593',6,0),(3,1,2,3,2,1,2200,'2026-09-28 08:15:11.593',6,'2026-09-28 08:15:11.593',6,0);
/*!40000 ALTER TABLE `RECONCILIATION_RUN_RULE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RECONCILIATION_STATE_MAP`
--

DROP TABLE IF EXISTS `RECONCILIATION_STATE_MAP`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RECONCILIATION_STATE_MAP` (
  `OUTCOME` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'RECONCILIATION_RESULT.OUTCOME value',
  `RECONCILIATION_STATE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Resulting NETWORK_ELEMENT.RECONCILIATION_STATE. Values: VERIFIED, DRIFTED, STALE, MISSING, DUPLICATE, NOT_DISCOVERED',
  `TARGET_OUTCOME` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Resulting SCAN_TARGET.LAST_OUTCOME, when the subject is a target. Values: EXACT_MATCH, DRIFTED, STALE, MISSING, ROGUE, UNCLAIMED, NO_ADAPTER',
  `EXCEPTION_STATE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'RECONCILIATION_EXCEPTION.STATE raised; NULL = no exception. Values: ROGUE, DRIFTED, MISSING, DUPLICATE, UNCLAIMED, NO_ADAPTER, ZOMBIE',
  PRIMARY KEY (`OUTCOME`),
  CONSTRAINT `CK_RECONCILIATION_STATE_MAP__EXCEPTION_STATE_VALUES` CHECK ((`EXCEPTION_STATE` in (_utf8mb4'ROGUE',_utf8mb4'DRIFTED',_utf8mb4'MISSING',_utf8mb4'DUPLICATE',_utf8mb4'UNCLAIMED',_utf8mb4'NO_ADAPTER',_utf8mb4'ZOMBIE'))),
  CONSTRAINT `CK_RECONCILIATION_STATE_MAP__OUTCOME_VALUES` CHECK ((`OUTCOME` in (_utf8mb4'MATCHED',_utf8mb4'ATTRIBUTE_MISMATCH',_utf8mb4'EXTRA_NO_RECORD',_utf8mb4'RELATIONSHIP_DRIFT',_utf8mb4'MISSING_NO_LIVE_PEER',_utf8mb4'UNRESOLVED_MATCH',_utf8mb4'STALE',_utf8mb4'NOT_COMPARABLE'))),
  CONSTRAINT `CK_RECONCILIATION_STATE_MAP__RECONCILIATION_STATE_VALUES` CHECK ((`RECONCILIATION_STATE` in (_utf8mb4'VERIFIED',_utf8mb4'DRIFTED',_utf8mb4'STALE',_utf8mb4'MISSING',_utf8mb4'DUPLICATE',_utf8mb4'NOT_DISCOVERED'))),
  CONSTRAINT `CK_RECONCILIATION_STATE_MAP__TARGET_OUTCOME_VALUES` CHECK ((`TARGET_OUTCOME` in (_utf8mb4'EXACT_MATCH',_utf8mb4'DRIFTED',_utf8mb4'STALE',_utf8mb4'MISSING',_utf8mb4'ROGUE',_utf8mb4'UNCLAIMED',_utf8mb4'NO_ADAPTER')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Mapping of reconciliation outcomes to resource, target and exception states. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RECONCILIATION_STATE_MAP`
--

LOCK TABLES `RECONCILIATION_STATE_MAP` WRITE;
/*!40000 ALTER TABLE `RECONCILIATION_STATE_MAP` DISABLE KEYS */;
INSERT INTO `RECONCILIATION_STATE_MAP` VALUES ('ATTRIBUTE_MISMATCH','DRIFTED','DRIFTED','DRIFTED'),('EXTRA_NO_RECORD','NOT_DISCOVERED','ROGUE','ROGUE'),('MATCHED','VERIFIED','EXACT_MATCH',NULL),('MISSING_NO_LIVE_PEER','MISSING','MISSING','MISSING'),('NOT_COMPARABLE','NOT_DISCOVERED','NO_ADAPTER','NO_ADAPTER'),('RELATIONSHIP_DRIFT','DRIFTED','DRIFTED','DRIFTED'),('STALE','STALE','STALE',NULL),('UNRESOLVED_MATCH','DUPLICATE','UNCLAIMED','UNCLAIMED');
/*!40000 ALTER TABLE `RECONCILIATION_STATE_MAP` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RELATIONSHIP_RULE`
--

DROP TABLE IF EXISTS `RELATIONSHIP_RULE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RELATIONSHIP_RULE` (
  `ID` smallint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK (catalog)',
  `RELATIONSHIP_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'FK RELATIONSHIP_TYPE.CODE',
  `FROM_RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'FK RESOURCE_TYPE.CODE: type of the dependent (FROM) resource',
  `TO_RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'FK RESOURCE_TYPE.CODE: type of the resource depended on (TO)',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RELATIONSHIP_RULE__TYPE_FROM_TO` (`RELATIONSHIP_TYPE`,`FROM_RESOURCE_TYPE`,`TO_RESOURCE_TYPE`),
  KEY `IDX_RELATIONSHIP_RULE__FROM_TYPE` (`FROM_RESOURCE_TYPE`),
  KEY `IDX_RELATIONSHIP_RULE__TO_TYPE` (`TO_RESOURCE_TYPE`),
  CONSTRAINT `FK_RELATIONSHIP_RULE__FROM_TYPE` FOREIGN KEY (`FROM_RESOURCE_TYPE`) REFERENCES `RESOURCE_TYPE` (`CODE`),
  CONSTRAINT `FK_RELATIONSHIP_RULE__RELATIONSHIP_TYPE` FOREIGN KEY (`RELATIONSHIP_TYPE`) REFERENCES `RELATIONSHIP_TYPE` (`CODE`),
  CONSTRAINT `FK_RELATIONSHIP_RULE__TO_TYPE` FOREIGN KEY (`TO_RESOURCE_TYPE`) REFERENCES `RESOURCE_TYPE` (`CODE`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Allowed relationship triples between resource typees. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RELATIONSHIP_RULE`
--

LOCK TABLES `RELATIONSHIP_RULE` WRITE;
/*!40000 ALTER TABLE `RELATIONSHIP_RULE` DISABLE KEYS */;
INSERT INTO `RELATIONSHIP_RULE` VALUES (22,'BACKHAULED_BY','PHYSICAL_NE','LINK'),(21,'BACKHAULED_BY','PHYSICAL_NE','SERVICE'),(23,'BACKHAULED_BY','RADIO_CELL','SERVICE'),(1,'CARRIED_BY','LINK','EXTERNAL_RESOURCE'),(4,'CARRIED_BY','SERVICE','EXTERNAL_RESOURCE'),(2,'CARRIED_BY','SERVICE','LINK'),(3,'CARRIED_BY','SERVICE','SERVICE'),(18,'DEPENDS_ON','CLOUD_CLUSTER','PHYSICAL_NE'),(14,'DEPENDS_ON','PHYSICAL_NE','PHYSICAL_NE'),(15,'DEPENDS_ON','PHYSICAL_NE','VIRTUAL_NE'),(17,'DEPENDS_ON','SERVICE','PHYSICAL_NE'),(16,'DEPENDS_ON','SERVICE','VIRTUAL_NE'),(13,'DEPENDS_ON','VIRTUAL_NE','PHYSICAL_NE'),(12,'DEPENDS_ON','VIRTUAL_NE','VIRTUAL_NE'),(19,'POWERED_BY','PHYSICAL_NE','POWER_UNIT'),(20,'POWERED_BY','RACK','POWER_UNIT'),(26,'REDUNDANT_WITH','LINK','LINK'),(24,'REDUNDANT_WITH','PHYSICAL_NE','PHYSICAL_NE'),(27,'REDUNDANT_WITH','SERVICE','SERVICE'),(25,'REDUNDANT_WITH','VIRTUAL_NE','VIRTUAL_NE'),(5,'RIDES_OVER','LINK','LINK'),(10,'SERVED_BY','NETWORK_SLICE','PHYSICAL_NE'),(11,'SERVED_BY','NETWORK_SLICE','RADIO_CELL'),(9,'SERVED_BY','NETWORK_SLICE','VIRTUAL_NE'),(8,'SERVED_BY','SITE','EXTERNAL_RESOURCE'),(6,'TERMINATES_ON','PASSIVE_PORT','EXTERNAL_RESOURCE'),(7,'TERMINATES_ON','PORT','EXTERNAL_RESOURCE');
/*!40000 ALTER TABLE `RELATIONSHIP_RULE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RELATIONSHIP_TYPE`
--

DROP TABLE IF EXISTS `RELATIONSHIP_TYPE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RELATIONSHIP_TYPE` (
  `CODE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Relationship code',
  `NAME` varchar(64) NOT NULL COMMENT 'Forward wording (is carried by)',
  `INVERSE_NAME` varchar(64) NOT NULL COMMENT 'Inverse wording (carries)',
  `IS_IMPACTING` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1 when a fault on the TO resource impacts the FROM resource (impact analysis follows it)',
  `IS_ACYCLIC` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1 when the relationship may not form a cycle (checked by the application)',
  `IS_ORDERED` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 when SEQUENCE_NUMBER orders several TO resources (a path of hops)',
  PRIMARY KEY (`CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Kind of cross-domain resource relationship. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RELATIONSHIP_TYPE`
--

LOCK TABLES `RELATIONSHIP_TYPE` WRITE;
/*!40000 ALTER TABLE `RELATIONSHIP_TYPE` DISABLE KEYS */;
INSERT INTO `RELATIONSHIP_TYPE` VALUES ('BACKHAULED_BY','is backhauled by','backhauls',1,1,0),('CARRIED_BY','is carried by','carries',1,1,1),('DEPENDS_ON','depends on','is depended on by',1,1,0),('POWERED_BY','is powered by','powers',1,1,0),('REDUNDANT_WITH','is redundant with','is redundant with',0,0,0),('RIDES_OVER','rides over','is ridden by',1,1,1),('SERVED_BY','is served by','serves',1,1,0),('TERMINATES_ON','terminates on','is terminated by',1,1,0);
/*!40000 ALTER TABLE `RELATIONSHIP_TYPE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `REPORT_DEFINITION`
--

DROP TABLE IF EXISTS `REPORT_DEFINITION`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `REPORT_DEFINITION` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `CODE` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Report id',
  `MODULE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Owning module. Values: DISCOVERY, INVENTORY',
  `NAME` varchar(150) NOT NULL COMMENT 'Report name',
  `QUESTION` varchar(500) NOT NULL COMMENT 'The question it answers',
  `AUDIENCE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Primary audience. Values: LEADERSHIP, OPERATIONS, ENGINEERING, FINANCE, PLANNING, GOVERNANCE',
  `CADENCE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Cadence. Values: DAILY, WEEKLY, MONTHLY, ON_DEMAND',
  `CRON_EXPRESSION` varchar(64) DEFAULT NULL COMMENT 'Schedule (Mondays 07:00 IST); NULL = on demand',
  `DISTRIBUTION` varchar(255) DEFAULT NULL COMMENT 'Distribution list / channel',
  `IS_FEATURED` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Featured on the landing page',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  `IS_DELETED` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Soft-delete flag (0 = active, 1 = deleted)',
  `LIVE_FLAG` tinyint(1) GENERATED ALWAYS AS (if((`IS_DELETED` = 0),1,NULL)) STORED COMMENT '1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_REPORT_DEFINITION__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_REPORT_DEFINITION__CODE` (`CUSTOMER_ID`,`CODE`,`LIVE_FLAG`),
  CONSTRAINT `FK_REPORT_DEFINITION__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `CK_REPORT_DEFINITION__AUDIENCE_VALUES` CHECK ((`AUDIENCE` in (_utf8mb4'LEADERSHIP',_utf8mb4'OPERATIONS',_utf8mb4'ENGINEERING',_utf8mb4'FINANCE',_utf8mb4'PLANNING',_utf8mb4'GOVERNANCE'))),
  CONSTRAINT `CK_REPORT_DEFINITION__CADENCE_VALUES` CHECK ((`CADENCE` in (_utf8mb4'DAILY',_utf8mb4'WEEKLY',_utf8mb4'MONTHLY',_utf8mb4'ON_DEMAND'))),
  CONSTRAINT `CK_REPORT_DEFINITION__MODULE_VALUES` CHECK ((`MODULE` in (_utf8mb4'DISCOVERY',_utf8mb4'INVENTORY'))),
  CONSTRAINT `CK_REPORT_DEFINITION__SCHEDULE` CHECK (((`CADENCE` = _utf8mb4'ON_DEMAND') = (`CRON_EXPRESSION` is null)))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Report catalogue entry (DR-01 Inventory trust executive, IN-03 Hardware lifecycle risk ...). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `REPORT_DEFINITION`
--

LOCK TABLES `REPORT_DEFINITION` WRITE;
/*!40000 ALTER TABLE `REPORT_DEFINITION` DISABLE KEYS */;
INSERT INTO `REPORT_DEFINITION` (`ID`, `CUSTOMER_ID`, `CODE`, `MODULE`, `NAME`, `QUESTION`, `AUDIENCE`, `CADENCE`, `CRON_EXPRESSION`, `DISTRIBUTION`, `IS_FEATURED`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`, `IS_DELETED`) VALUES (1,1,'DR-01','DISCOVERY','Inventory trust executive','How much of the network can we trust the inventory for, per domain?','LEADERSHIP','WEEKLY','0 7 * * 1','cto-office@opco.local',1,'2026-09-28 08:15:11.596',1,'2026-09-28 08:15:11.596',1,0,0),(2,1,'IN-03','INVENTORY','Hardware lifecycle risk','Which deployed hardware is past end-of-sale or approaching end-of-life?','ENGINEERING','MONTHLY','0 6 1 * *','planning@opco.local',0,'2026-09-28 08:15:11.596',1,'2026-09-28 08:15:11.596',1,0,0),(3,1,'DR-04','DISCOVERY','Rogue devices','Which responding devices have no inventory record?','OPERATIONS','ON_DEMAND',NULL,NULL,0,'2026-09-28 08:15:11.596',1,'2026-09-28 08:15:11.596',1,0,0);
/*!40000 ALTER TABLE `REPORT_DEFINITION` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `REPORT_RUN`
--

DROP TABLE IF EXISTS `REPORT_RUN`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `REPORT_RUN` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `REPORT_DEFINITION_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK REPORT_DEFINITION.ID; NULL for ad-hoc exports',
  `NAME` varchar(150) NOT NULL COMMENT 'Report name as generated (NETWORK-DISCOVERY-SUMMARY)',
  `REPORT_TYPE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Report type. Values: CLUSTER, SITE, DISCOVERY, INVENTORY, CAPEX, COMPLIANCE',
  `GENERATED_TYPE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'How it was triggered. Values: SCHEDULED, AUTOMATED, ADHOC',
  `FORMAT` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'File format. Values: PDF, XLSX, CSV, DOCX, HTML, JSON',
  `STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'PENDING' COMMENT 'Generation status. Values: PENDING, RUNNING, COMPLETED, FAILED',
  `SNAPSHOT_REFERENCE` varchar(40) DEFAULT NULL COMMENT 'Data snapshot the report read (TRUST-2026-W36)',
  `FILE_REFERENCE` varchar(255) DEFAULT NULL COMMENT 'Object-store key of the file',
  `FILE_SIZE_BYTES` int unsigned DEFAULT NULL COMMENT 'File size, bytes (a generated report never approaches 4 GB)',
  `FAILURE_MESSAGE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Why it failed',
  `COMPLETED_TIME` datetime(3) DEFAULT NULL COMMENT 'Finished (UTC)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_REPORT_RUN__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  KEY `IDX_REPORT_RUN__REPORT_DEFINITION_ID` (`CUSTOMER_ID`,`REPORT_DEFINITION_ID_FK`),
  KEY `IDX_REPORT_RUN__STATUS_CREATED_TIME` (`CUSTOMER_ID`,`STATUS`,`CREATED_TIME`),
  CONSTRAINT `FK_REPORT_RUN__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_REPORT_RUN__REPORT_DEFINITION_ID` FOREIGN KEY (`CUSTOMER_ID`, `REPORT_DEFINITION_ID_FK`) REFERENCES `REPORT_DEFINITION` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_REPORT_RUN__DONE` CHECK ((((`STATUS` = _utf8mb4'COMPLETED') = (`FILE_REFERENCE` is not null)) and ((`STATUS` = _utf8mb4'FAILED') = (`FAILURE_MESSAGE` is not null)))),
  CONSTRAINT `CK_REPORT_RUN__FORMAT_VALUES` CHECK ((`FORMAT` in (_utf8mb4'PDF',_utf8mb4'XLSX',_utf8mb4'CSV',_utf8mb4'DOCX',_utf8mb4'HTML',_utf8mb4'JSON'))),
  CONSTRAINT `CK_REPORT_RUN__GENERATED_TYPE_VALUES` CHECK ((`GENERATED_TYPE` in (_utf8mb4'SCHEDULED',_utf8mb4'AUTOMATED',_utf8mb4'ADHOC'))),
  CONSTRAINT `CK_REPORT_RUN__REPORT_TYPE_VALUES` CHECK ((`REPORT_TYPE` in (_utf8mb4'CLUSTER',_utf8mb4'SITE',_utf8mb4'DISCOVERY',_utf8mb4'INVENTORY',_utf8mb4'CAPEX',_utf8mb4'COMPLIANCE'))),
  CONSTRAINT `CK_REPORT_RUN__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'PENDING',_utf8mb4'RUNNING',_utf8mb4'COMPLETED',_utf8mb4'FAILED')))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Generated report (production Reports grid).  [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `REPORT_RUN`
--

LOCK TABLES `REPORT_RUN` WRITE;
/*!40000 ALTER TABLE `REPORT_RUN` DISABLE KEYS */;
INSERT INTO `REPORT_RUN` VALUES (1,1,1,'Inventory trust executive - week 38','DISCOVERY','SCHEDULED','PDF','COMPLETED','SNAP-2026W38','reports/2026/38/DR-01.pdf',482113,NULL,'2026-09-21 07:02:11.000','2026-09-28 08:15:11.597',1,'2026-09-28 08:15:11.597',1,0),(2,1,2,'Hardware lifecycle risk - September','INVENTORY','SCHEDULED','XLSX','COMPLETED','SNAP-2026M09','reports/2026/09/IN-03.xlsx',96770,NULL,'2026-09-01 06:01:40.000','2026-09-28 08:15:11.597',1,'2026-09-28 08:15:11.597',1,0),(3,1,3,'Rogue devices - ad hoc','DISCOVERY','ADHOC','CSV','FAILED',NULL,NULL,NULL,'Snapshot store unavailable',NULL,'2026-09-28 08:15:11.597',2,'2026-09-28 08:15:11.597',2,0);
/*!40000 ALTER TABLE `REPORT_RUN` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RESOURCE`
--

DROP TABLE IF EXISTS `RESOURCE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RESOURCE` (
  `ID` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK (BIGINT: aggregates ports, components and every other type)',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'FK RESOURCE_TYPE.CODE; never changes after insert',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RESOURCE__CUSTOMER_ID_ID_RESOURCE_TYPE` (`CUSTOMER_ID`,`ID`,`RESOURCE_TYPE`),
  UNIQUE KEY `UK_RESOURCE__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  KEY `IDX_RESOURCE__RESOURCE_TYPE` (`RESOURCE_TYPE`),
  CONSTRAINT `FK_RESOURCE__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RESOURCE__RESOURCE_TYPE` FOREIGN KEY (`RESOURCE_TYPE`) REFERENCES `RESOURCE_TYPE` (`CODE`)
) ENGINE=InnoDB AUTO_INCREMENT=44 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Supertype row of every inventory object. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RESOURCE`
--

LOCK TABLES `RESOURCE` WRITE;
/*!40000 ALTER TABLE `RESOURCE` DISABLE KEYS */;
INSERT INTO `RESOURCE` VALUES (1,1,'SITE','2026-09-28 08:15:11.535'),(2,1,'SITE','2026-09-28 08:15:11.535'),(3,1,'SITE','2026-09-28 08:15:11.535'),(4,1,'RACK','2026-09-28 08:15:11.535'),(5,1,'RACK','2026-09-28 08:15:11.535'),(6,1,'RACK','2026-09-28 08:15:11.535'),(7,1,'PHYSICAL_NE','2026-09-28 08:15:11.535'),(8,1,'PHYSICAL_NE','2026-09-28 08:15:11.535'),(9,1,'PHYSICAL_NE','2026-09-28 08:15:11.535'),(10,1,'PHYSICAL_NE','2026-09-28 08:15:11.535'),(11,1,'PHYSICAL_NE','2026-09-28 08:15:11.535'),(12,1,'PHYSICAL_NE','2026-09-28 08:15:11.535'),(13,1,'VIRTUAL_NE','2026-09-28 08:15:11.535'),(14,1,'PHYSICAL_NE','2026-09-28 08:15:11.535'),(15,1,'CLOUD_CLUSTER','2026-09-28 08:15:11.535'),(16,1,'PASSIVE_ASSET','2026-09-28 08:15:11.535'),(17,1,'POWER_UNIT','2026-09-28 08:15:11.535'),(18,1,'EXTERNAL_RESOURCE','2026-09-28 08:15:11.535'),(19,1,'RADIO_SECTOR','2026-09-28 08:15:11.535'),(20,1,'RADIO_SECTOR','2026-09-28 08:15:11.535'),(21,1,'ANTENNA','2026-09-28 08:15:11.535'),(22,1,'ANTENNA','2026-09-28 08:15:11.535'),(23,1,'RADIO_CELL','2026-09-28 08:15:11.535'),(24,1,'RADIO_CELL','2026-09-28 08:15:11.535'),(25,1,'LINK','2026-09-28 08:15:11.535'),(26,1,'LINK','2026-09-28 08:15:11.535'),(27,1,'LINK','2026-09-28 08:15:11.535'),(28,1,'SERVICE','2026-09-28 08:15:11.535'),(29,1,'SERVICE','2026-09-28 08:15:11.535'),(30,1,'IP_SUBNET','2026-09-28 08:15:11.535'),(31,1,'IP_SUBNET','2026-09-28 08:15:11.535'),(32,1,'IP_SUBNET','2026-09-28 08:15:11.535'),(33,1,'VRF','2026-09-28 08:15:11.535'),(34,1,'VLAN','2026-09-28 08:15:11.535'),(35,1,'NETWORK_SLICE','2026-09-28 08:15:11.535'),(36,1,'PORT','2026-09-28 08:15:11.535'),(37,1,'PORT','2026-09-28 08:15:11.535'),(38,1,'LOGICAL_INTERFACE','2026-09-28 08:15:11.535'),(39,1,'PORT','2026-09-28 08:15:11.535'),(40,1,'PORT','2026-09-28 08:15:11.535'),(41,1,'EQUIPMENT_COMPONENT','2026-09-28 08:15:11.535'),(42,1,'EQUIPMENT_COMPONENT','2026-09-28 08:15:11.535'),(43,1,'EQUIPMENT_COMPONENT','2026-09-28 08:15:11.535');
/*!40000 ALTER TABLE `RESOURCE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RESOURCE_ASSET`
--

DROP TABLE IF EXISTS `RESOURCE_ASSET`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RESOURCE_ASSET` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID: device, passive asset, power unit, antenna, rack ...',
  `ASSET_TAG` varchar(40) DEFAULT NULL COMMENT 'Asset tag / barcode',
  `PURCHASE_ORDER_NUMBER` varchar(40) DEFAULT NULL COMMENT 'Purchase order',
  `PROJECT_NUMBER` varchar(40) DEFAULT NULL COMMENT 'Project',
  `PURCHASE_DATE` date DEFAULT NULL COMMENT 'Purchase date',
  `PURCHASE_COST` decimal(14,2) DEFAULT NULL COMMENT 'Purchase cost',
  `CURRENCY_CODE` char(3) DEFAULT NULL COMMENT 'ISO 4217 currency of PURCHASE_COST',
  `OWNERSHIP` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'OWNED' COMMENT 'Ownership model. Values: OWNED, LEASED, RENTED, IRU, VENDOR_MANAGED, CUSTOMER_PROVIDED',
  `WARRANTY_START_DATE` date DEFAULT NULL COMMENT 'Warranty start',
  `WARRANTY_END_DATE` date DEFAULT NULL COMMENT 'Warranty end',
  `MAINTENANCE_CONTRACT_VENDOR` varchar(100) DEFAULT NULL COMMENT 'Annual maintenance / service contractor (was also POWER_UNIT.CONTRACTOR)',
  `MAINTENANCE_CONTRACT_END_DATE` date DEFAULT NULL COMMENT 'AMC end',
  `LICENSE_EXPIRY_DATE` date DEFAULT NULL COMMENT 'Software licence expiry',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RESOURCE_ASSET__RESOURCE_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`),
  UNIQUE KEY `UK_RESOURCE_ASSET__ASSET_TAG` (`CUSTOMER_ID`,`ASSET_TAG`),
  CONSTRAINT `FK_RESOURCE_ASSET__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RESOURCE_ASSET__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `CK_RESOURCE_ASSET__CURRENCY` CHECK (((`CURRENCY_CODE` is null) or regexp_like(`CURRENCY_CODE`,_utf8mb4'^[A-Z]{3}$',_utf8mb4'c'))),
  CONSTRAINT `CK_RESOURCE_ASSET__MONEY` CHECK ((((`PURCHASE_COST` is null) = (`CURRENCY_CODE` is null)) and ((`PURCHASE_COST` is null) or (`PURCHASE_COST` >= 0)))),
  CONSTRAINT `CK_RESOURCE_ASSET__OWNERSHIP_VALUES` CHECK ((`OWNERSHIP` in (_utf8mb4'OWNED',_utf8mb4'LEASED',_utf8mb4'RENTED',_utf8mb4'IRU',_utf8mb4'VENDOR_MANAGED',_utf8mb4'CUSTOMER_PROVIDED'))),
  CONSTRAINT `CK_RESOURCE_ASSET__WARRANTY` CHECK (((`WARRANTY_END_DATE` is null) or (`WARRANTY_START_DATE` is null) or (`WARRANTY_END_DATE` >= `WARRANTY_START_DATE`)))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Commercial record of any resource (asset tag, purchase, ownership, warranty, AMC), 1:1 by resource. Kept in Inventory pending validation: PO / cost columns may move to the Open / CoPEX module. [v6, 2026-09-28]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RESOURCE_ASSET`
--

LOCK TABLES `RESOURCE_ASSET` WRITE;
/*!40000 ALTER TABLE `RESOURCE_ASSET` DISABLE KEYS */;
INSERT INTO `RESOURCE_ASSET` VALUES (1,1,7,'AST-000771','PO-2025-1188','PRJ-AGG-2025','2025-10-01',18500000.00,'INR','OWNED','2025-10-20','2028-10-19','Cisco SmartNet','2028-10-19',NULL,'2026-09-28 08:15:11.571',2,'2026-09-28 08:15:11.571',2,0),(2,1,10,'AST-000902','PO-2024-0412','PRJ-5G-KA-1','2024-03-15',4200000.00,'INR','OWNED','2024-05-12','2027-05-11','Ericsson MS','2027-05-11',NULL,'2026-09-28 08:15:11.571',2,'2026-09-28 08:15:11.571',2,0);
/*!40000 ALTER TABLE `RESOURCE_ASSET` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RESOURCE_ATTRIBUTE`
--

DROP TABLE IF EXISTS `RESOURCE_ATTRIBUTE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RESOURCE_ATTRIBUTE` (
  `ID` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Copy of the resource type, FK-bound to both RESOURCE and the definition',
  `ATTRIBUTE_DEFINITION_ID_FK` int unsigned NOT NULL COMMENT 'FK ATTRIBUTE_DEFINITION.ID',
  `DATA_TYPE` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Copy of the definition data type, FK-bound',
  `VALUE_STRING` varchar(255) DEFAULT NULL COMMENT 'Value when DATA_TYPE = STRING',
  `VALUE_NUMBER` decimal(20,6) DEFAULT NULL COMMENT 'Value when DATA_TYPE = NUMBER',
  `VALUE_BOOLEAN` tinyint(1) DEFAULT NULL COMMENT 'Value when DATA_TYPE = BOOLEAN',
  `VALUE_DATE` date DEFAULT NULL COMMENT 'Value when DATA_TYPE = DATE',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RESOURCE_ATTRIBUTE__RESOURCE_ID_DEFINITION_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`ATTRIBUTE_DEFINITION_ID_FK`),
  KEY `IDX_RESOURCE_ATTRIBUTE__RESOURCE` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`RESOURCE_TYPE`),
  KEY `IDX_RESOURCE_ATTRIBUTE__DEFINITION` (`CUSTOMER_ID`,`ATTRIBUTE_DEFINITION_ID_FK`,`RESOURCE_TYPE`,`DATA_TYPE`),
  CONSTRAINT `FK_RESOURCE_ATTRIBUTE__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RESOURCE_ATTRIBUTE__DEFINITION` FOREIGN KEY (`CUSTOMER_ID`, `ATTRIBUTE_DEFINITION_ID_FK`, `RESOURCE_TYPE`, `DATA_TYPE`) REFERENCES `ATTRIBUTE_DEFINITION` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`, `DATA_TYPE`),
  CONSTRAINT `FK_RESOURCE_ATTRIBUTE__RESOURCE` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `CK_RESOURCE_ATTRIBUTE__DATA_TYPE_VALUES` CHECK ((`DATA_TYPE` in (_utf8mb4'STRING',_utf8mb4'NUMBER',_utf8mb4'BOOLEAN',_utf8mb4'DATE'))),
  CONSTRAINT `CK_RESOURCE_ATTRIBUTE__ONE_VALUE` CHECK ((((`DATA_TYPE` = _utf8mb4'STRING') = (`VALUE_STRING` is not null)) and ((`DATA_TYPE` = _utf8mb4'NUMBER') = (`VALUE_NUMBER` is not null)) and ((`DATA_TYPE` = _utf8mb4'BOOLEAN') = (`VALUE_BOOLEAN` is not null)) and ((`DATA_TYPE` = _utf8mb4'DATE') = (`VALUE_DATE` is not null))))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Value of an extensible attribute on one resource, typed by its definition. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RESOURCE_ATTRIBUTE`
--

LOCK TABLES `RESOURCE_ATTRIBUTE` WRITE;
/*!40000 ALTER TABLE `RESOURCE_ATTRIBUTE` DISABLE KEYS */;
INSERT INTO `RESOURCE_ATTRIBUTE` VALUES (1,1,7,'PHYSICAL_NE',1,'STRING','KA',NULL,NULL,NULL,'2026-09-28 08:15:11.575',2,'2026-09-28 08:15:11.575',2,0),(2,1,1,'SITE',2,'NUMBER',NULL,12.500000,NULL,NULL,'2026-09-28 08:15:11.575',2,'2026-09-28 08:15:11.575',2,0);
/*!40000 ALTER TABLE `RESOURCE_ATTRIBUTE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RESOURCE_EXTERNAL_REFERENCE`
--

DROP TABLE IF EXISTS `RESOURCE_EXTERNAL_REFERENCE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RESOURCE_EXTERNAL_REFERENCE` (
  `ID` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID',
  `EXTERNAL_SYSTEM_ID_FK` int unsigned NOT NULL COMMENT 'FK EXTERNAL_SYSTEM.ID',
  `EXTERNAL_ID` varchar(128) NOT NULL COMMENT 'Id of the resource in that system',
  `IS_SYSTEM_OF_RECORD` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 when that system is authoritative for this resource (at most one)',
  `SYSTEM_OF_RECORD_FLAG` tinyint(1) GENERATED ALWAYS AS (if((`IS_SYSTEM_OF_RECORD` = 1),1,NULL)) STORED COMMENT 'Derived: keeps the system of record unique per resource',
  `SYNC_STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'IN_SYNC' COMMENT 'Last sync outcome. Values: IN_SYNC, PENDING, FAILED, NOT_FOUND',
  `LAST_SYNC_TIME` datetime(3) DEFAULT NULL COMMENT 'Last sync (UTC)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RESOURCE_EXTERNAL_REFERENCE__RESOURCE_ID_EXTERNAL_SYSTEM_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`EXTERNAL_SYSTEM_ID_FK`),
  UNIQUE KEY `UK_RESOURCE_EXTERNAL_REFERENCE__EXTERNAL_SYSTEM_ID_EXTERNAL_ID` (`CUSTOMER_ID`,`EXTERNAL_SYSTEM_ID_FK`,`EXTERNAL_ID`),
  UNIQUE KEY `UK_RESOURCE_EXTERNAL_REFERENCE__RESOURCE_ID_SOR` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`SYSTEM_OF_RECORD_FLAG`),
  CONSTRAINT `FK_RESOURCE_EXTERNAL_REFERENCE__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RESOURCE_EXTERNAL_REFERENCE__EXTERNAL_SYSTEM_ID` FOREIGN KEY (`CUSTOMER_ID`, `EXTERNAL_SYSTEM_ID_FK`) REFERENCES `EXTERNAL_SYSTEM` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RESOURCE_EXTERNAL_REFERENCE__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `CK_RESOURCE_EXTERNAL_REFERENCE__SYNC_STATUS_VALUES` CHECK ((`SYNC_STATUS` in (_utf8mb4'IN_SYNC',_utf8mb4'PENDING',_utf8mb4'FAILED',_utf8mb4'NOT_FOUND')))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Id of an inventory resource in another system; one per system, at most one system of record. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RESOURCE_EXTERNAL_REFERENCE`
--

LOCK TABLES `RESOURCE_EXTERNAL_REFERENCE` WRITE;
/*!40000 ALTER TABLE `RESOURCE_EXTERNAL_REFERENCE` DISABLE KEYS */;
INSERT INTO `RESOURCE_EXTERNAL_REFERENCE` (`ID`, `CUSTOMER_ID`, `RESOURCE_ID_FK`, `EXTERNAL_SYSTEM_ID_FK`, `EXTERNAL_ID`, `IS_SYSTEM_OF_RECORD`, `SYNC_STATUS`, `LAST_SYNC_TIME`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`) VALUES (1,1,10,4,'SubNetwork=ONRM_ROOT,MeContext=BLR-277-GNB',1,'IN_SYNC','2026-09-25 03:00:00.000','2026-09-28 08:15:11.574',6,'2026-09-28 08:15:11.574',6,0),(2,1,11,4,'SubNetwork=ONRM_ROOT,MeContext=BLR-277-GNB,FieldReplaceableUnit=RU-S1',1,'IN_SYNC','2026-09-25 03:00:00.000','2026-09-28 08:15:11.574',6,'2026-09-28 08:15:11.574',6,0);
/*!40000 ALTER TABLE `RESOURCE_EXTERNAL_REFERENCE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RESOURCE_FIELD_PROVENANCE`
--

DROP TABLE IF EXISTS `RESOURCE_FIELD_PROVENANCE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RESOURCE_FIELD_PROVENANCE` (
  `ID` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID',
  `FIELD_CODE` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'FK RECONCILIATION_FIELD.CODE',
  `FIELD_VALUE` varchar(255) DEFAULT NULL COMMENT 'Value that source supplied',
  `SOURCE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Kind of source. Values: SCOPE, DERIVED_SNMP_OID, DEVICE_COLLECTOR, HARDWARE_COLLECTOR, LINK_COLLECTOR, SERVICE_COLLECTOR, EXTERNAL_SYSTEM, MANUAL, WORK_ORDER, PLANNED_CIQ',
  `EXTERNAL_SYSTEM_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK EXTERNAL_SYSTEM.ID when SOURCE = EXTERNAL_SYSTEM (which EMS / CMDB / ERP)',
  `SOURCE_REFERENCE` varchar(64) DEFAULT NULL COMMENT 'Work order / run reference behind the value',
  `OBSERVED_TIME` datetime(3) NOT NULL COMMENT 'When the source supplied it (UTC)',
  `IS_CONFIRMED` tinyint(1) NOT NULL DEFAULT '1' COMMENT '0 when the source disagrees with the golden value',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RESOURCE_FIELD_PROVENANCE__RESOURCE_ID_FIELD_CODE` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`FIELD_CODE`),
  KEY `IDX_RESOURCE_FIELD_PROVENANCE__FIELD_CODE` (`FIELD_CODE`),
  KEY `IDX_RESOURCE_FIELD_PROVENANCE__EXTERNAL_SYSTEM_ID` (`CUSTOMER_ID`,`EXTERNAL_SYSTEM_ID_FK`),
  CONSTRAINT `FK_RESOURCE_FIELD_PROVENANCE__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RESOURCE_FIELD_PROVENANCE__EXTERNAL_SYSTEM_ID` FOREIGN KEY (`CUSTOMER_ID`, `EXTERNAL_SYSTEM_ID_FK`) REFERENCES `EXTERNAL_SYSTEM` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RESOURCE_FIELD_PROVENANCE__FIELD_CODE` FOREIGN KEY (`FIELD_CODE`) REFERENCES `RECONCILIATION_FIELD` (`CODE`),
  CONSTRAINT `FK_RESOURCE_FIELD_PROVENANCE__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `CK_RESOURCE_FIELD_PROVENANCE__SOURCE_VALUES` CHECK ((`SOURCE` in (_utf8mb4'SCOPE',_utf8mb4'DERIVED_SNMP_OID',_utf8mb4'DEVICE_COLLECTOR',_utf8mb4'HARDWARE_COLLECTOR',_utf8mb4'LINK_COLLECTOR',_utf8mb4'SERVICE_COLLECTOR',_utf8mb4'EXTERNAL_SYSTEM',_utf8mb4'MANUAL',_utf8mb4'WORK_ORDER',_utf8mb4'PLANNED_CIQ'))),
  CONSTRAINT `CK_RESOURCE_FIELD_PROVENANCE__SYSTEM` CHECK (((`SOURCE` = _utf8mb4'EXTERNAL_SYSTEM') = (`EXTERNAL_SYSTEM_ID_FK` is not null)))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Per-field provenance of any resource''s golden record. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RESOURCE_FIELD_PROVENANCE`
--

LOCK TABLES `RESOURCE_FIELD_PROVENANCE` WRITE;
/*!40000 ALTER TABLE `RESOURCE_FIELD_PROVENANCE` DISABLE KEYS */;
INSERT INTO `RESOURCE_FIELD_PROVENANCE` VALUES (1,1,7,'NETWORK_ELEMENT_NAME','BLR-AGG-R07','DEVICE_COLLECTOR',NULL,'sysName','2026-09-25 01:58:03.000',1,'2026-09-28 08:15:11.574',6,'2026-09-28 08:15:11.574',6,0),(2,1,7,'MANAGEMENT_IP','10.20.7.1','SCOPE',NULL,'DSC-BLR-IPMPLS','2026-09-25 01:58:03.000',1,'2026-09-28 08:15:11.574',6,'2026-09-28 08:15:11.574',6,0),(3,1,7,'OS_VERSION','7.9.1','DEVICE_COLLECTOR',NULL,'sysDescr','2026-09-25 01:58:03.000',1,'2026-09-28 08:15:11.574',6,'2026-09-28 08:15:11.574',6,0),(4,1,7,'SERIAL_NUMBER','FOX2233A1B7','HARDWARE_COLLECTOR',NULL,'entPhysicalSerialNum','2026-09-25 01:58:03.000',1,'2026-09-28 08:15:11.574',6,'2026-09-28 08:15:11.574',6,0),(5,1,23,'PHYSICAL_CELL_ID','213','EXTERNAL_SYSTEM',4,'NRCellDU.nRPCI','2026-09-25 03:00:00.000',0,'2026-09-28 08:15:11.574',6,'2026-09-28 08:15:11.574',6,0);
/*!40000 ALTER TABLE `RESOURCE_FIELD_PROVENANCE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RESOURCE_RELATIONSHIP`
--

DROP TABLE IF EXISTS `RESOURCE_RELATIONSHIP`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RESOURCE_RELATIONSHIP` (
  `ID` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RELATIONSHIP_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'RELATIONSHIP_TYPE.CODE; FK-checked with both types against RELATIONSHIP_RULE',
  `FROM_RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID: the dependent resource',
  `FROM_RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Copy of the FROM resource type, FK-bound to RESOURCE',
  `TO_RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID: the resource depended on',
  `TO_RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Copy of the TO resource type, FK-bound to RESOURCE',
  `SEQUENCE_NUMBER` smallint unsigned NOT NULL DEFAULT '0' COMMENT 'Hop order for ordered types (a path); 0 when unordered',
  `RECORD_SOURCE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'How the row entered inventory. Values: DISCOVERED, PLANNED_CIQ, MANUAL, EMS, EXTERNAL_SYNC',
  `EXTERNAL_SYSTEM_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK EXTERNAL_SYSTEM.ID that supplied it (EXTERNAL_SYNC / EMS)',
  `RECORD_STATE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'ACTIVE' COMMENT 'INACTIVE = no longer true. Values: ACTIVE, INACTIVE',
  `INACTIVE_TIME` datetime(3) DEFAULT NULL COMMENT 'When it went inactive (UTC)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  `ACTIVE_FLAG` tinyint(1) GENERATED ALWAYS AS (if((`RECORD_STATE` = _utf8mb4'ACTIVE'),1,NULL)) STORED COMMENT '1 while ACTIVE, NULL once INACTIVE: UNIQUE keys ending in ACTIVE_FLAG ignore retired rows',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RESOURCE_RELATIONSHIP__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_RESOURCE_RELATIONSHIP__FROM_TYPE_TO_SEQ` (`CUSTOMER_ID`,`FROM_RESOURCE_ID_FK`,`RELATIONSHIP_TYPE`,`TO_RESOURCE_ID_FK`,`SEQUENCE_NUMBER`,`ACTIVE_FLAG`),
  KEY `IDX_RESOURCE_RELATIONSHIP__FROM` (`CUSTOMER_ID`,`FROM_RESOURCE_ID_FK`,`FROM_RESOURCE_TYPE`),
  KEY `IDX_RESOURCE_RELATIONSHIP__TO` (`CUSTOMER_ID`,`TO_RESOURCE_ID_FK`,`TO_RESOURCE_TYPE`),
  KEY `IDX_RESOURCE_RELATIONSHIP__RULE` (`RELATIONSHIP_TYPE`,`FROM_RESOURCE_TYPE`,`TO_RESOURCE_TYPE`),
  KEY `IDX_RESOURCE_RELATIONSHIP__EXTERNAL_SYSTEM_ID` (`CUSTOMER_ID`,`EXTERNAL_SYSTEM_ID_FK`),
  CONSTRAINT `FK_RESOURCE_RELATIONSHIP__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RESOURCE_RELATIONSHIP__EXTERNAL_SYSTEM_ID` FOREIGN KEY (`CUSTOMER_ID`, `EXTERNAL_SYSTEM_ID_FK`) REFERENCES `EXTERNAL_SYSTEM` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_RESOURCE_RELATIONSHIP__FROM` FOREIGN KEY (`CUSTOMER_ID`, `FROM_RESOURCE_ID_FK`, `FROM_RESOURCE_TYPE`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `FK_RESOURCE_RELATIONSHIP__RULE` FOREIGN KEY (`RELATIONSHIP_TYPE`, `FROM_RESOURCE_TYPE`, `TO_RESOURCE_TYPE`) REFERENCES `RELATIONSHIP_RULE` (`RELATIONSHIP_TYPE`, `FROM_RESOURCE_TYPE`, `TO_RESOURCE_TYPE`),
  CONSTRAINT `FK_RESOURCE_RELATIONSHIP__TO` FOREIGN KEY (`CUSTOMER_ID`, `TO_RESOURCE_ID_FK`, `TO_RESOURCE_TYPE`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `CK_RESOURCE_RELATIONSHIP__INACTIVE` CHECK (((`RECORD_STATE` = _utf8mb4'INACTIVE') = (`INACTIVE_TIME` is not null))),
  CONSTRAINT `CK_RESOURCE_RELATIONSHIP__NOT_SELF` CHECK ((`FROM_RESOURCE_ID_FK` <> `TO_RESOURCE_ID_FK`)),
  CONSTRAINT `CK_RESOURCE_RELATIONSHIP__RECORD_SOURCE_VALUES` CHECK ((`RECORD_SOURCE` in (_utf8mb4'DISCOVERED',_utf8mb4'PLANNED_CIQ',_utf8mb4'MANUAL',_utf8mb4'EMS',_utf8mb4'EXTERNAL_SYNC'))),
  CONSTRAINT `CK_RESOURCE_RELATIONSHIP__RECORD_STATE_VALUES` CHECK ((`RECORD_STATE` in (_utf8mb4'ACTIVE',_utf8mb4'INACTIVE'))),
  CONSTRAINT `CK_RESOURCE_RELATIONSHIP__SOURCE_SYSTEM` CHECK (((`RECORD_SOURCE` not in (_utf8mb4'EXTERNAL_SYNC',_utf8mb4'EMS')) or (`EXTERNAL_SYSTEM_ID_FK` is not null)))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Typed dependency between two resources that no explicit FK models; FROM depends on TO. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RESOURCE_RELATIONSHIP`
--

LOCK TABLES `RESOURCE_RELATIONSHIP` WRITE;
/*!40000 ALTER TABLE `RESOURCE_RELATIONSHIP` DISABLE KEYS */;
INSERT INTO `RESOURCE_RELATIONSHIP` (`ID`, `CUSTOMER_ID`, `RELATIONSHIP_TYPE`, `FROM_RESOURCE_ID_FK`, `FROM_RESOURCE_TYPE`, `TO_RESOURCE_ID_FK`, `TO_RESOURCE_TYPE`, `SEQUENCE_NUMBER`, `RECORD_SOURCE`, `EXTERNAL_SYSTEM_ID_FK`, `RECORD_STATE`, `INACTIVE_TIME`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`) VALUES (1,1,'DEPENDS_ON',11,'PHYSICAL_NE',10,'PHYSICAL_NE',0,'EMS',4,'ACTIVE',NULL,'2026-09-28 08:15:11.573',6,'2026-09-28 08:15:11.573',6,0),(2,1,'POWERED_BY',10,'PHYSICAL_NE',17,'POWER_UNIT',0,'MANUAL',NULL,'ACTIVE',NULL,'2026-09-28 08:15:11.573',2,'2026-09-28 08:15:11.573',2,0),(3,1,'CARRIED_BY',25,'LINK',18,'EXTERNAL_RESOURCE',1,'MANUAL',NULL,'ACTIVE',NULL,'2026-09-28 08:15:11.573',2,'2026-09-28 08:15:11.573',2,0),(4,1,'SERVED_BY',35,'NETWORK_SLICE',23,'RADIO_CELL',0,'MANUAL',NULL,'ACTIVE',NULL,'2026-09-28 08:15:11.573',2,'2026-09-28 08:15:11.573',2,0),(5,1,'BACKHAULED_BY',10,'PHYSICAL_NE',29,'SERVICE',0,'MANUAL',NULL,'ACTIVE',NULL,'2026-09-28 08:15:11.573',2,'2026-09-28 08:15:11.573',2,0),(6,1,'DEPENDS_ON',13,'VIRTUAL_NE',12,'PHYSICAL_NE',0,'MANUAL',NULL,'ACTIVE',NULL,'2026-09-28 08:15:11.573',2,'2026-09-28 08:15:11.573',2,0);
/*!40000 ALTER TABLE `RESOURCE_RELATIONSHIP` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RESOURCE_TECHNOLOGY`
--

DROP TABLE IF EXISTS `RESOURCE_TECHNOLOGY`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RESOURCE_TECHNOLOGY` (
  `ID` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID',
  `TECHNOLOGY_ID_FK` smallint unsigned NOT NULL COMMENT 'FK TECHNOLOGY.ID',
  `NR_MODE` varchar(4) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'For NR only: non-standalone or standalone. Values: NSA, SA',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_RESOURCE_TECHNOLOGY__RESOURCE_ID_TECHNOLOGY_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`TECHNOLOGY_ID_FK`),
  KEY `IDX_RESOURCE_TECHNOLOGY__TECHNOLOGY_ID` (`TECHNOLOGY_ID_FK`),
  CONSTRAINT `FK_RESOURCE_TECHNOLOGY__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_RESOURCE_TECHNOLOGY__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `FK_RESOURCE_TECHNOLOGY__TECHNOLOGY_ID` FOREIGN KEY (`TECHNOLOGY_ID_FK`) REFERENCES `TECHNOLOGY` (`ID`),
  CONSTRAINT `CK_RESOURCE_TECHNOLOGY__NR_MODE_VALUES` CHECK ((`NR_MODE` in (_utf8mb4'NSA',_utf8mb4'SA')))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Technologies a resource supports; replaces single-valued technology columns. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RESOURCE_TECHNOLOGY`
--

LOCK TABLES `RESOURCE_TECHNOLOGY` WRITE;
/*!40000 ALTER TABLE `RESOURCE_TECHNOLOGY` DISABLE KEYS */;
INSERT INTO `RESOURCE_TECHNOLOGY` VALUES (1,1,7,12,NULL,'2026-09-28 08:15:11.572',1,'2026-09-28 08:15:11.572',1,0),(2,1,7,14,NULL,'2026-09-28 08:15:11.572',1,'2026-09-28 08:15:11.572',1,0),(3,1,10,6,'SA','2026-09-28 08:15:11.572',1,'2026-09-28 08:15:11.572',1,0),(4,1,13,9,NULL,'2026-09-28 08:15:11.572',1,'2026-09-28 08:15:11.572',1,0);
/*!40000 ALTER TABLE `RESOURCE_TECHNOLOGY` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RESOURCE_TYPE`
--

DROP TABLE IF EXISTS `RESOURCE_TYPE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RESOURCE_TYPE` (
  `CODE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Type code (SITE, PHYSICAL_NE, VIRTUAL_NE, PORT, LINK, RADIO_CELL, EXTERNAL_RESOURCE ...)',
  `NAME` varchar(50) NOT NULL COMMENT 'Display name',
  `INVENTORY_CATEGORY` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Inventory view the type belongs to. Values: FACILITY, ACTIVE, PASSIVE, LOGICAL, CONNECTIVITY, SERVICE, EXTERNAL',
  `RESOURCE_LAYER` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Resource layer for physical -> logical -> service analysis. Values: PHYSICAL, LOGICAL, SERVICE, EXTERNAL',
  `SUBTYPE_TABLE` varchar(32) NOT NULL COMMENT 'Table holding the type rows (SITE, NETWORK_ELEMENT, PORT ...)',
  PRIMARY KEY (`CODE`),
  CONSTRAINT `CK_RESOURCE_TYPE__INVENTORY_CATEGORY_VALUES` CHECK ((`INVENTORY_CATEGORY` in (_utf8mb4'FACILITY',_utf8mb4'ACTIVE',_utf8mb4'PASSIVE',_utf8mb4'LOGICAL',_utf8mb4'CONNECTIVITY',_utf8mb4'SERVICE',_utf8mb4'EXTERNAL'))),
  CONSTRAINT `CK_RESOURCE_TYPE__RESOURCE_LAYER_VALUES` CHECK ((`RESOURCE_LAYER` in (_utf8mb4'PHYSICAL',_utf8mb4'LOGICAL',_utf8mb4'SERVICE',_utf8mb4'EXTERNAL')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Type of every RESOURCE row with inventory category and layer. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RESOURCE_TYPE`
--

LOCK TABLES `RESOURCE_TYPE` WRITE;
/*!40000 ALTER TABLE `RESOURCE_TYPE` DISABLE KEYS */;
INSERT INTO `RESOURCE_TYPE` VALUES ('ANTENNA','Antenna','PASSIVE','PHYSICAL','ANTENNA'),('CLOUD_CLUSTER','Cloud cluster / subcloud','LOGICAL','LOGICAL','CLOUD_CLUSTER'),('EQUIPMENT_COMPONENT','Equipment component','ACTIVE','PHYSICAL','EQUIPMENT_COMPONENT'),('EXTERNAL_RESOURCE','External resource (fiber plant ...)','EXTERNAL','EXTERNAL','EXTERNAL_RESOURCE'),('IP_SUBNET','IP subnet','LOGICAL','LOGICAL','IP_SUBNET'),('LINK','Link','CONNECTIVITY','LOGICAL','LINK'),('LOGICAL_INTERFACE','Logical interface','LOGICAL','LOGICAL','PORT'),('NETWORK_SLICE','Network slice','SERVICE','SERVICE','NETWORK_SLICE'),('PASSIVE_ASSET','Passive asset (owned by Passive Inventory)','PASSIVE','PHYSICAL','EXTERNAL_RESOURCE'),('PASSIVE_PORT','Passive port (ODF / DDF position, owned by Passive','PASSIVE','PHYSICAL','EXTERNAL_RESOURCE'),('PHYSICAL_NE','Physical network element','ACTIVE','PHYSICAL','NETWORK_ELEMENT'),('PORT','Physical port','ACTIVE','PHYSICAL','PORT'),('POWER_UNIT','Power unit (owned by Passive Inventory)','PASSIVE','PHYSICAL','EXTERNAL_RESOURCE'),('RACK','Rack / cabinet','PASSIVE','PHYSICAL','RACK'),('RADIO_CELL','Radio cell','LOGICAL','LOGICAL','RADIO_CELL'),('RADIO_SECTOR','Radio sector','LOGICAL','LOGICAL','RADIO_SECTOR'),('SERVICE','Network service','SERVICE','SERVICE','SERVICE_INSTANCE'),('SITE','Site','FACILITY','PHYSICAL','SITE'),('VIRTUAL_NE','Virtual network function (VNF / CNF)','ACTIVE','LOGICAL','NETWORK_ELEMENT'),('VLAN','VLAN','LOGICAL','LOGICAL','VLAN'),('VRF','VRF instance','LOGICAL','LOGICAL','VRF');
/*!40000 ALTER TABLE `RESOURCE_TYPE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ROOM`
--

DROP TABLE IF EXISTS `ROOM`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ROOM` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `SITE_ID_FK` int unsigned NOT NULL COMMENT 'FK SITE.ID: copy of the floor''s site, FK-bound',
  `FLOOR_ID_FK` int unsigned NOT NULL COMMENT 'FK FLOOR.ID',
  `NAME` varchar(60) NOT NULL COMMENT 'Room name',
  `ROOM_TYPE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'EQUIPMENT' COMMENT 'Room purpose. Values: EQUIPMENT, BATTERY, MDF, POWER, OTHER',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_ROOM__FLOOR_ID_NAME` (`CUSTOMER_ID`,`FLOOR_ID_FK`,`NAME`),
  UNIQUE KEY `UK_ROOM__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_ROOM__SITE_ID_ID` (`CUSTOMER_ID`,`SITE_ID_FK`,`ID`),
  KEY `IDX_ROOM__SITE_ID_FLOOR_ID` (`CUSTOMER_ID`,`SITE_ID_FK`,`FLOOR_ID_FK`),
  CONSTRAINT `FK_ROOM__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_ROOM__SITE_ID_FLOOR_ID` FOREIGN KEY (`CUSTOMER_ID`, `SITE_ID_FK`, `FLOOR_ID_FK`) REFERENCES `FLOOR` (`CUSTOMER_ID`, `SITE_ID_FK`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `CK_ROOM__ROOM_TYPE_VALUES` CHECK ((`ROOM_TYPE` in (_utf8mb4'EQUIPMENT',_utf8mb4'BATTERY',_utf8mb4'MDF',_utf8mb4'POWER',_utf8mb4'OTHER')))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Room / hall on a floor (equipment room, battery room, MDF). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ROOM`
--

LOCK TABLES `ROOM` WRITE;
/*!40000 ALTER TABLE `ROOM` DISABLE KEYS */;
INSERT INTO `ROOM` VALUES (1,1,2,1,'Equipment room 1','EQUIPMENT','2026-09-28 08:15:11.538',1,'2026-09-28 08:15:11.538',1,0),(2,1,2,1,'Battery room','BATTERY','2026-09-28 08:15:11.538',1,'2026-09-28 08:15:11.538',1,0),(3,1,3,2,'Hall A','EQUIPMENT','2026-09-28 08:15:11.538',1,'2026-09-28 08:15:11.538',1,0);
/*!40000 ALTER TABLE `ROOM` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SCAN_JOB`
--

DROP TABLE IF EXISTS `SCAN_JOB`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SCAN_JOB` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `CODE` varchar(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Job id',
  `DOMAIN_ID_FK` smallint unsigned NOT NULL COMMENT 'FK DOMAIN.ID: network domain (RAN, Core, Transport, Transport > IP/MPLS); one dimension shared by Discovery, Reconciliation and Inventory',
  `SOURCE_KIND` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'COLLECTOR' COMMENT 'How the network is read. Values: COLLECTOR, EXTERNAL_SYSTEM',
  `COLLECTOR_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK COLLECTOR.ID when SOURCE_KIND = COLLECTOR',
  `CREDENTIAL_PROFILE_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK CREDENTIAL_PROFILE.ID when SOURCE_KIND = COLLECTOR',
  `EXTERNAL_SYSTEM_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK EXTERNAL_SYSTEM.ID (EMS / NMS / controller API) when SOURCE_KIND = EXTERNAL_SYSTEM',
  `OPERATIONAL_AREA_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK OPERATIONAL_AREA.ID: area the job covers',
  `SCHEDULE_KIND` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Schedule type. Values: CONTINUOUS, INTERVAL, DAILY, WEEKLY, CRON, ON_DEMAND',
  `INTERVAL_MINUTES` int unsigned DEFAULT NULL COMMENT 'Sweep / interval period for CONTINUOUS and INTERVAL',
  `CRON_EXPRESSION` varchar(64) DEFAULT NULL COMMENT 'Cron for DAILY / WEEKLY / CRON (0 2 * * 0 = Weekly Sun 02:00)',
  `SCHEDULE_STATE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'LIVE' COMMENT 'HELD keeps the cadence but does not run until released. Values: LIVE, HELD',
  `HELD_REASON` varchar(200) DEFAULT NULL COMMENT 'Why the job is held',
  `NEXT_RUN_TIME` datetime(3) DEFAULT NULL COMMENT 'Next scheduled run (UTC); overdue is derived from cadence + grace',
  `MAX_CRAWL_DEPTH` tinyint unsigned DEFAULT NULL COMMENT 'Topology crawl depth for SEED scopes',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  `IS_DELETED` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Soft-delete flag (0 = active, 1 = deleted)',
  `LIVE_FLAG` tinyint(1) GENERATED ALWAYS AS (if((`IS_DELETED` = 0),1,NULL)) STORED COMMENT '1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_SCAN_JOB__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_SCAN_JOB__CODE` (`CUSTOMER_ID`,`CODE`,`LIVE_FLAG`),
  KEY `IDX_SCAN_JOB__OPERATIONAL_AREA_ID` (`CUSTOMER_ID`,`OPERATIONAL_AREA_ID_FK`),
  KEY `IDX_SCAN_JOB__CREDENTIAL_PROFILE_ID` (`CUSTOMER_ID`,`CREDENTIAL_PROFILE_ID_FK`),
  KEY `IDX_SCAN_JOB__COLLECTOR_ID` (`CUSTOMER_ID`,`COLLECTOR_ID_FK`),
  KEY `IDX_SCAN_JOB__EXTERNAL_SYSTEM_ID` (`CUSTOMER_ID`,`EXTERNAL_SYSTEM_ID_FK`),
  KEY `IDX_SCAN_JOB__DOMAIN_ID_SCHEDULE_STATE` (`CUSTOMER_ID`,`DOMAIN_ID_FK`,`SCHEDULE_STATE`),
  KEY `IDX_SCAN_JOB__DOMAIN_ID` (`DOMAIN_ID_FK`),
  CONSTRAINT `FK_SCAN_JOB__COLLECTOR_ID` FOREIGN KEY (`CUSTOMER_ID`, `COLLECTOR_ID_FK`) REFERENCES `COLLECTOR` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_SCAN_JOB__CREDENTIAL_PROFILE_ID` FOREIGN KEY (`CUSTOMER_ID`, `CREDENTIAL_PROFILE_ID_FK`) REFERENCES `CREDENTIAL_PROFILE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_SCAN_JOB__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_SCAN_JOB__DOMAIN_ID` FOREIGN KEY (`DOMAIN_ID_FK`) REFERENCES `DOMAIN` (`ID`),
  CONSTRAINT `FK_SCAN_JOB__EXTERNAL_SYSTEM_ID` FOREIGN KEY (`CUSTOMER_ID`, `EXTERNAL_SYSTEM_ID_FK`) REFERENCES `EXTERNAL_SYSTEM` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_SCAN_JOB__OPERATIONAL_AREA_ID` FOREIGN KEY (`CUSTOMER_ID`, `OPERATIONAL_AREA_ID_FK`) REFERENCES `OPERATIONAL_AREA` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_SCAN_JOB__HELD` CHECK (((`SCHEDULE_STATE` = _utf8mb4'HELD') = (`HELD_REASON` is not null))),
  CONSTRAINT `CK_SCAN_JOB__SCHEDULE` CHECK ((((`SCHEDULE_KIND` in (_utf8mb4'CONTINUOUS',_utf8mb4'INTERVAL')) = (`INTERVAL_MINUTES` is not null)) and ((`SCHEDULE_KIND` in (_utf8mb4'DAILY',_utf8mb4'WEEKLY',_utf8mb4'CRON')) = (`CRON_EXPRESSION` is not null)))),
  CONSTRAINT `CK_SCAN_JOB__SCHEDULE_KIND_VALUES` CHECK ((`SCHEDULE_KIND` in (_utf8mb4'CONTINUOUS',_utf8mb4'INTERVAL',_utf8mb4'DAILY',_utf8mb4'WEEKLY',_utf8mb4'CRON',_utf8mb4'ON_DEMAND'))),
  CONSTRAINT `CK_SCAN_JOB__SCHEDULE_STATE_VALUES` CHECK ((`SCHEDULE_STATE` in (_utf8mb4'LIVE',_utf8mb4'HELD'))),
  CONSTRAINT `CK_SCAN_JOB__SOURCE` CHECK ((((`SOURCE_KIND` = _utf8mb4'COLLECTOR') = ((`COLLECTOR_ID_FK` is not null) and (`CREDENTIAL_PROFILE_ID_FK` is not null))) and ((`SOURCE_KIND` = _utf8mb4'EXTERNAL_SYSTEM') = (`EXTERNAL_SYSTEM_ID_FK` is not null)) and ((`SOURCE_KIND` = _utf8mb4'COLLECTOR') or ((`COLLECTOR_ID_FK` is null) and (`CREDENTIAL_PROFILE_ID_FK` is null))))),
  CONSTRAINT `CK_SCAN_JOB__SOURCE_KIND_VALUES` CHECK ((`SOURCE_KIND` in (_utf8mb4'COLLECTOR',_utf8mb4'EXTERNAL_SYSTEM')))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Discovery job: scope + collector + credential profile + schedule (DSC-SOUTH-CORE). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SCAN_JOB`
--

LOCK TABLES `SCAN_JOB` WRITE;
/*!40000 ALTER TABLE `SCAN_JOB` DISABLE KEYS */;
INSERT INTO `SCAN_JOB` (`ID`, `CUSTOMER_ID`, `CODE`, `DOMAIN_ID_FK`, `SOURCE_KIND`, `COLLECTOR_ID_FK`, `CREDENTIAL_PROFILE_ID_FK`, `EXTERNAL_SYSTEM_ID_FK`, `OPERATIONAL_AREA_ID_FK`, `SCHEDULE_KIND`, `INTERVAL_MINUTES`, `CRON_EXPRESSION`, `SCHEDULE_STATE`, `HELD_REASON`, `NEXT_RUN_TIME`, `MAX_CRAWL_DEPTH`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`, `IS_DELETED`) VALUES (1,1,'DSC-BLR-IPMPLS',4,'COLLECTOR',1,1,NULL,2,'CRON',NULL,'0 */6 * * *','LIVE',NULL,'2026-09-25 06:00:00.000',2,'2026-09-28 08:15:11.580',2,'2026-09-28 08:15:11.580',2,0,0),(2,1,'DSC-BLR-RAN',1,'EXTERNAL_SYSTEM',NULL,NULL,4,2,'DAILY',NULL,'0 3 * * *','LIVE',NULL,'2026-09-26 03:00:00.000',NULL,'2026-09-28 08:15:11.580',2,'2026-09-28 08:15:11.580',2,0,0),(3,1,'DSC-BLR-OPTICAL',5,'COLLECTOR',1,1,NULL,2,'CRON',NULL,'0 4 * * *','HELD','TL1 credential rotation pending',NULL,NULL,'2026-09-28 08:15:11.580',2,'2026-09-28 08:15:11.580',2,0,0);
/*!40000 ALTER TABLE `SCAN_JOB` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SCAN_JOB_SCOPE`
--

DROP TABLE IF EXISTS `SCAN_JOB_SCOPE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SCAN_JOB_SCOPE` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `SCAN_JOB_ID_FK` int unsigned NOT NULL COMMENT 'FK SCAN_JOB.ID',
  `SCOPE_KIND` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Scope kind. Values: CIDR, SEED, SITE, NF_SET',
  `SCOPE_VALUE` varchar(100) NOT NULL COMMENT '172.31.31.0/24, 192.168.10.235, BLR-EAST, AMF/UPF',
  `SITE_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK SITE.ID when SCOPE_KIND = SITE',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_SCAN_JOB_SCOPE__SCAN_JOB_ID_SCOPE_KIND_SCOPE_VALUE` (`CUSTOMER_ID`,`SCAN_JOB_ID_FK`,`SCOPE_KIND`,`SCOPE_VALUE`),
  KEY `IDX_SCAN_JOB_SCOPE__SITE_ID` (`CUSTOMER_ID`,`SITE_ID_FK`),
  CONSTRAINT `FK_SCAN_JOB_SCOPE__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_SCAN_JOB_SCOPE__SCAN_JOB_ID` FOREIGN KEY (`CUSTOMER_ID`, `SCAN_JOB_ID_FK`) REFERENCES `SCAN_JOB` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `FK_SCAN_JOB_SCOPE__SITE_ID` FOREIGN KEY (`CUSTOMER_ID`, `SITE_ID_FK`) REFERENCES `SITE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_SCAN_JOB_SCOPE__SCOPE_KIND_VALUES` CHECK ((`SCOPE_KIND` in (_utf8mb4'CIDR',_utf8mb4'SEED',_utf8mb4'SITE',_utf8mb4'NF_SET'))),
  CONSTRAINT `CK_SCAN_JOB_SCOPE__SITE` CHECK (((`SCOPE_KIND` = _utf8mb4'SITE') = (`SITE_ID_FK` is not null)))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='One scope entry of a job: a CIDR, a seed address with crawl depth, a site, or a logical NF set. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SCAN_JOB_SCOPE`
--

LOCK TABLES `SCAN_JOB_SCOPE` WRITE;
/*!40000 ALTER TABLE `SCAN_JOB_SCOPE` DISABLE KEYS */;
INSERT INTO `SCAN_JOB_SCOPE` VALUES (1,1,1,'CIDR','10.20.7.0/24',NULL,'2026-09-28 08:15:11.581',2,'2026-09-28 08:15:11.581',2,0),(2,1,1,'SITE','KA-BLRW-101',2,'2026-09-28 08:15:11.581',2,'2026-09-28 08:15:11.581',2,0),(3,1,2,'NF_SET','ENM:BLR-*',NULL,'2026-09-28 08:15:11.581',2,'2026-09-28 08:15:11.581',2,0),(4,1,3,'SEED','10.20.7.10',NULL,'2026-09-28 08:15:11.581',2,'2026-09-28 08:15:11.581',2,0);
/*!40000 ALTER TABLE `SCAN_JOB_SCOPE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SCAN_RUN`
--

DROP TABLE IF EXISTS `SCAN_RUN`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SCAN_RUN` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `SCAN_JOB_ID_FK` int unsigned NOT NULL COMMENT 'FK SCAN_JOB.ID',
  `RUN_NUMBER` int unsigned NOT NULL COMMENT 'Run number within the job (4412)',
  `TRIGGER_SOURCE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'SCHEDULER' COMMENT 'What started the run. Values: SCHEDULER, MANUAL, API, RETRY',
  `STATUS` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'RUNNING' COMMENT 'Run state. Values: RUNNING, COMPLETED, COMPLETED_WITH_ERRORS, FAILED, NO_ADAPTER',
  `STARTED_TIME` datetime(3) NOT NULL COMMENT 'Start (UTC)',
  `ENDED_TIME` datetime(3) DEFAULT NULL COMMENT 'End (UTC); a cycle must close within the 6 h cycle SLA',
  `DURATION_MS` int unsigned GENERATED ALWAYS AS (if((`ENDED_TIME` is null),NULL,(timestampdiff(MICROSECOND,`STARTED_TIME`,`ENDED_TIME`) DIV 1000))) STORED COMMENT 'Derived; never typed (INT: a run is bounded by the 6 h cycle SLA, far below the 49-day INT limit)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_SCAN_RUN__SCAN_JOB_ID_RUN_NUMBER` (`CUSTOMER_ID`,`SCAN_JOB_ID_FK`,`RUN_NUMBER`),
  UNIQUE KEY `UK_SCAN_RUN__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  KEY `IDX_SCAN_RUN__STARTED_TIME` (`CUSTOMER_ID`,`STARTED_TIME`),
  CONSTRAINT `FK_SCAN_RUN__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_SCAN_RUN__SCAN_JOB_ID` FOREIGN KEY (`CUSTOMER_ID`, `SCAN_JOB_ID_FK`) REFERENCES `SCAN_JOB` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_SCAN_RUN__ENDED` CHECK ((((`STATUS` = _utf8mb4'RUNNING') = (`ENDED_TIME` is null)) and ((`ENDED_TIME` is null) or (`ENDED_TIME` >= `STARTED_TIME`)))),
  CONSTRAINT `CK_SCAN_RUN__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'RUNNING',_utf8mb4'COMPLETED',_utf8mb4'COMPLETED_WITH_ERRORS',_utf8mb4'FAILED',_utf8mb4'NO_ADAPTER'))),
  CONSTRAINT `CK_SCAN_RUN__TRIGGER_SOURCE_VALUES` CHECK ((`TRIGGER_SOURCE` in (_utf8mb4'SCHEDULER',_utf8mb4'MANUAL',_utf8mb4'API',_utf8mb4'RETRY')))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='One execution of a scan job. Target counts are derived from SCAN_RUN_TARGET by the API. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SCAN_RUN`
--

LOCK TABLES `SCAN_RUN` WRITE;
/*!40000 ALTER TABLE `SCAN_RUN` DISABLE KEYS */;
INSERT INTO `SCAN_RUN` (`ID`, `CUSTOMER_ID`, `SCAN_JOB_ID_FK`, `RUN_NUMBER`, `TRIGGER_SOURCE`, `STATUS`, `STARTED_TIME`, `ENDED_TIME`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`) VALUES (1,1,1,212,'SCHEDULER','COMPLETED_WITH_ERRORS','2026-09-25 00:00:02.000','2026-09-25 00:07:40.000','2026-09-28 08:15:11.582',6,'2026-09-28 08:15:11.582',6,0),(2,1,2,88,'SCHEDULER','COMPLETED','2026-09-25 03:00:00.000','2026-09-25 03:04:12.000','2026-09-28 08:15:11.582',6,'2026-09-28 08:15:11.582',6,0),(3,1,1,213,'MANUAL','RUNNING','2026-09-25 06:00:01.000',NULL,'2026-09-28 08:15:11.582',2,'2026-09-28 08:15:11.582',2,0);
/*!40000 ALTER TABLE `SCAN_RUN` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SCAN_RUN_TARGET`
--

DROP TABLE IF EXISTS `SCAN_RUN_TARGET`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SCAN_RUN_TARGET` (
  `ID` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `SCAN_RUN_ID_FK` int unsigned NOT NULL COMMENT 'FK SCAN_RUN.ID',
  `SCAN_TARGET_ID_FK` int unsigned NOT NULL COMMENT 'FK SCAN_TARGET.ID',
  `STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Derived from the step chain. Values: SUCCESS, PARTIAL, FAILED',
  `TARGET_OUTCOME` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Reconciliation-facing outcome. Values: EXACT_MATCH, DRIFTED, STALE, MISSING, ROGUE, UNCLAIMED, NO_ADAPTER',
  `FAILURE_REASON` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Why it failed; drives the pipeline funnel and root-cause groups. Values: HOST_UNREACHABLE, SNMP_TIMEOUT, AUTH_FAILED, PARSE_ERROR, NO_ADAPTER, DUPLICATE_IP',
  `FAILURE_STAGE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Pipeline stage where it dropped. Values: SCOPE, REACHABILITY, CREDENTIAL, COLLECT, PARSE, IDENTITY, STORE',
  `MATCHED_NETWORK_ELEMENT_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK NETWORK_ELEMENT.ID the run matched',
  `MATCH_RULE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Identity rule that matched, in priority order. Values: CHASSIS_SERIAL, CHASSIS_MAC, SYSNAME_AREA, MANAGEMENT_IP, EXTERNAL_ID, CELL_IDENTITY',
  `MATCH_CONFIDENCE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Confidence of the match. Values: EXACT, STRONG, WEAK',
  `DURATION_MS` int unsigned DEFAULT NULL COMMENT 'Time spent on the target, ms',
  `NOTE` varchar(255) DEFAULT NULL COMMENT 'Run note (OS version 21.2R3-S8.4 -> S8.5, accepted network)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_SCAN_RUN_TARGET__SCAN_RUN_ID_SCAN_TARGET_ID` (`CUSTOMER_ID`,`SCAN_RUN_ID_FK`,`SCAN_TARGET_ID_FK`),
  UNIQUE KEY `UK_SCAN_RUN_TARGET__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  KEY `IDX_SCAN_RUN_TARGET__MATCHED_NETWORK_ELEMENT_ID` (`CUSTOMER_ID`,`MATCHED_NETWORK_ELEMENT_ID_FK`),
  KEY `IDX_SCAN_RUN_TARGET__SCAN_TARGET_ID` (`CUSTOMER_ID`,`SCAN_TARGET_ID_FK`),
  CONSTRAINT `FK_SCAN_RUN_TARGET__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_SCAN_RUN_TARGET__MATCHED_NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `MATCHED_NETWORK_ELEMENT_ID_FK`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_SCAN_RUN_TARGET__SCAN_RUN_ID` FOREIGN KEY (`CUSTOMER_ID`, `SCAN_RUN_ID_FK`) REFERENCES `SCAN_RUN` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `FK_SCAN_RUN_TARGET__SCAN_TARGET_ID` FOREIGN KEY (`CUSTOMER_ID`, `SCAN_TARGET_ID_FK`) REFERENCES `SCAN_TARGET` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_SCAN_RUN_TARGET__FAILED` CHECK (((`STATUS` = _utf8mb4'FAILED') <= (`FAILURE_REASON` is not null))),
  CONSTRAINT `CK_SCAN_RUN_TARGET__FAILURE_REASON_VALUES` CHECK ((`FAILURE_REASON` in (_utf8mb4'HOST_UNREACHABLE',_utf8mb4'SNMP_TIMEOUT',_utf8mb4'AUTH_FAILED',_utf8mb4'PARSE_ERROR',_utf8mb4'NO_ADAPTER',_utf8mb4'DUPLICATE_IP'))),
  CONSTRAINT `CK_SCAN_RUN_TARGET__FAILURE_STAGE_VALUES` CHECK ((`FAILURE_STAGE` in (_utf8mb4'SCOPE',_utf8mb4'REACHABILITY',_utf8mb4'CREDENTIAL',_utf8mb4'COLLECT',_utf8mb4'PARSE',_utf8mb4'IDENTITY',_utf8mb4'STORE'))),
  CONSTRAINT `CK_SCAN_RUN_TARGET__MATCH` CHECK ((((`MATCHED_NETWORK_ELEMENT_ID_FK` is null) = (`MATCH_RULE` is null)) and ((`MATCH_RULE` is null) = (`MATCH_CONFIDENCE` is null)))),
  CONSTRAINT `CK_SCAN_RUN_TARGET__MATCH_CONFIDENCE_VALUES` CHECK ((`MATCH_CONFIDENCE` in (_utf8mb4'EXACT',_utf8mb4'STRONG',_utf8mb4'WEAK'))),
  CONSTRAINT `CK_SCAN_RUN_TARGET__MATCH_RULE_VALUES` CHECK ((`MATCH_RULE` in (_utf8mb4'CHASSIS_SERIAL',_utf8mb4'CHASSIS_MAC',_utf8mb4'SYSNAME_AREA',_utf8mb4'MANAGEMENT_IP',_utf8mb4'EXTERNAL_ID',_utf8mb4'CELL_IDENTITY'))),
  CONSTRAINT `CK_SCAN_RUN_TARGET__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'SUCCESS',_utf8mb4'PARTIAL',_utf8mb4'FAILED'))),
  CONSTRAINT `CK_SCAN_RUN_TARGET__TARGET_OUTCOME_VALUES` CHECK ((`TARGET_OUTCOME` in (_utf8mb4'EXACT_MATCH',_utf8mb4'DRIFTED',_utf8mb4'STALE',_utf8mb4'MISSING',_utf8mb4'ROGUE',_utf8mb4'UNCLAIMED',_utf8mb4'NO_ADAPTER')))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Result of one target in one run: status, outcome, failure reason, identity match (rule + confidence). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SCAN_RUN_TARGET`
--

LOCK TABLES `SCAN_RUN_TARGET` WRITE;
/*!40000 ALTER TABLE `SCAN_RUN_TARGET` DISABLE KEYS */;
INSERT INTO `SCAN_RUN_TARGET` VALUES (1,1,1,1,'SUCCESS','EXACT_MATCH',NULL,NULL,1,'CHASSIS_SERIAL','EXACT',8120,NULL,'2026-09-28 08:15:11.583',6,'2026-09-28 08:15:11.583',6,0),(2,1,1,2,'SUCCESS','EXACT_MATCH',NULL,NULL,2,'CHASSIS_MAC','STRONG',6410,NULL,'2026-09-28 08:15:11.583',6,'2026-09-28 08:15:11.583',6,0),(3,1,1,3,'PARTIAL','ROGUE','PARSE_ERROR','PARSE',NULL,NULL,NULL,9950,'Unknown sysObjectID; device not in inventory','2026-09-28 08:15:11.583',6,'2026-09-28 08:15:11.583',6,0),(4,1,1,4,'FAILED','MISSING','HOST_UNREACHABLE','REACHABILITY',NULL,NULL,NULL,5000,NULL,'2026-09-28 08:15:11.583',6,'2026-09-28 08:15:11.583',6,0),(5,1,2,5,'SUCCESS','DRIFTED',NULL,NULL,4,'SYSNAME_AREA','EXACT',61000,'PCI of BLR-277-S1-N78 differs from record','2026-09-28 08:15:11.583',6,'2026-09-28 08:15:11.583',6,0);
/*!40000 ALTER TABLE `SCAN_RUN_TARGET` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SCAN_STEP_PAYLOAD`
--

DROP TABLE IF EXISTS `SCAN_STEP_PAYLOAD`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SCAN_STEP_PAYLOAD` (
  `ID` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `SCAN_STEP_RESULT_ID_FK` bigint unsigned NOT NULL COMMENT 'FK SCAN_STEP_RESULT.ID',
  `KIND` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Which capture. Values: REQUEST, RESPONSE',
  `CONTENT_ENCRYPTED` mediumblob NOT NULL COMMENT 'AES-256-CBC(text) with CONTENT_ENCRYPTION_IV; secrets and community strings redacted before encryption',
  `CONTENT_ENCRYPTION_IV` varbinary(16) NOT NULL COMMENT 'Per-row initialisation vector',
  `CONTENT_BYTES` int unsigned NOT NULL COMMENT 'Plaintext byte length',
  `CONTENT_SHA256` binary(32) NOT NULL COMMENT 'SHA-256 of the plaintext',
  `ENCRYPTION_KEY_REFERENCE` varchar(64) NOT NULL COMMENT 'Vault key id',
  `PURGE_AFTER` datetime(3) NOT NULL COMMENT 'Retention deadline',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_SCAN_STEP_PAYLOAD__SCAN_STEP_RESULT_ID_KIND` (`CUSTOMER_ID`,`SCAN_STEP_RESULT_ID_FK`,`KIND`),
  KEY `IDX_SCAN_STEP_PAYLOAD__PURGE_AFTER` (`CUSTOMER_ID`,`PURGE_AFTER`),
  CONSTRAINT `FK_SCAN_STEP_PAYLOAD__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_SCAN_STEP_PAYLOAD__SCAN_STEP_RESULT_ID` FOREIGN KEY (`CUSTOMER_ID`, `SCAN_STEP_RESULT_ID_FK`) REFERENCES `SCAN_STEP_RESULT` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `CK_SCAN_STEP_PAYLOAD__KIND_VALUES` CHECK ((`KIND` in (_utf8mb4'REQUEST',_utf8mb4'RESPONSE')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Raw request / response of a step, AES-encrypted (device output can carry configuration and customer data). Split out so hot tables stay narrow; purged by retention. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SCAN_STEP_PAYLOAD`
--

LOCK TABLES `SCAN_STEP_PAYLOAD` WRITE;
/*!40000 ALTER TABLE `SCAN_STEP_PAYLOAD` DISABLE KEYS */;
INSERT INTO `SCAN_STEP_PAYLOAD` VALUES (1,1,9,'RESPONSE',_binary 'Ÿ:À\Þ',_binary '\0\"3DUfwˆ™ª»\Ì\Ý\îÿ',512,_binary '\ã°\ÄB˜üšû\ôÈ™o¹$\'®A\äd›“L¤•™xR¸U','kv/inventory/payload-key/2026-09','2026-10-25 00:00:00.000','2026-09-28 08:15:11.585',6,'2026-09-28 08:15:11.585',6,0);
/*!40000 ALTER TABLE `SCAN_STEP_PAYLOAD` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SCAN_STEP_RESULT`
--

DROP TABLE IF EXISTS `SCAN_STEP_RESULT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SCAN_STEP_RESULT` (
  `ID` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `SCAN_RUN_TARGET_ID_FK` bigint unsigned NOT NULL COMMENT 'FK SCAN_RUN_TARGET.ID',
  `DISCOVERY_STEP_DEFINITION_ID_FK` smallint unsigned NOT NULL COMMENT 'FK DISCOVERY_STEP_DEFINITION.ID',
  `STATE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Step state. Values: PASSED, FAILED, SKIPPED, NOT_APPLICABLE, WAITING, RUNNING',
  `STARTED_TIME` datetime(3) DEFAULT NULL COMMENT 'Start (UTC)',
  `DURATION_MS` int unsigned DEFAULT NULL COMMENT 'Duration, ms',
  `RESPONSE_BYTES` int unsigned DEFAULT NULL COMMENT 'Bytes received',
  `WROTE_SUMMARY` varchar(255) DEFAULT NULL COMMENT 'What went into inventory (serial JN1236F87AFB, 51 hardware components)',
  `FAILURE_REASON` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Why the step failed. Values: HOST_UNREACHABLE, SNMP_TIMEOUT, AUTH_FAILED, PARSE_ERROR, NO_ADAPTER, DUPLICATE_IP',
  `SUGGESTED_ACTION` varchar(255) DEFAULT NULL COMMENT 'Next action (Retry at 8000 ms)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_SCAN_STEP_RESULT__SCAN_RUN_TARGET_ID_STEP_DEF_ID` (`CUSTOMER_ID`,`SCAN_RUN_TARGET_ID_FK`,`DISCOVERY_STEP_DEFINITION_ID_FK`),
  UNIQUE KEY `UK_SCAN_STEP_RESULT__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  KEY `IDX_SCAN_STEP_RESULT__DISCOVERY_STEP_DEFINITION_ID` (`DISCOVERY_STEP_DEFINITION_ID_FK`),
  CONSTRAINT `FK_SCAN_STEP_RESULT__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_SCAN_STEP_RESULT__DISCOVERY_STEP_DEFINITION_ID` FOREIGN KEY (`DISCOVERY_STEP_DEFINITION_ID_FK`) REFERENCES `DISCOVERY_STEP_DEFINITION` (`ID`),
  CONSTRAINT `FK_SCAN_STEP_RESULT__SCAN_RUN_TARGET_ID` FOREIGN KEY (`CUSTOMER_ID`, `SCAN_RUN_TARGET_ID_FK`) REFERENCES `SCAN_RUN_TARGET` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `CK_SCAN_STEP_RESULT__FAILED` CHECK (((`STATE` = _utf8mb4'FAILED') = (`FAILURE_REASON` is not null))),
  CONSTRAINT `CK_SCAN_STEP_RESULT__FAILURE_REASON_VALUES` CHECK ((`FAILURE_REASON` in (_utf8mb4'HOST_UNREACHABLE',_utf8mb4'SNMP_TIMEOUT',_utf8mb4'AUTH_FAILED',_utf8mb4'PARSE_ERROR',_utf8mb4'NO_ADAPTER',_utf8mb4'DUPLICATE_IP'))),
  CONSTRAINT `CK_SCAN_STEP_RESULT__STATE_VALUES` CHECK ((`STATE` in (_utf8mb4'PASSED',_utf8mb4'FAILED',_utf8mb4'SKIPPED',_utf8mb4'NOT_APPLICABLE',_utf8mb4'WAITING',_utf8mb4'RUNNING')))
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='One collector step for one target in one run (the transcript line): state, timing, bytes, what it wrote. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SCAN_STEP_RESULT`
--

LOCK TABLES `SCAN_STEP_RESULT` WRITE;
/*!40000 ALTER TABLE `SCAN_STEP_RESULT` DISABLE KEYS */;
INSERT INTO `SCAN_STEP_RESULT` VALUES (1,1,1,1,'PASSED','2026-09-25 00:00:02.000',40,64,'reachable, 2.4 ms',NULL,NULL,'2026-09-28 08:15:11.584',6,'2026-09-28 08:15:11.584',6,0),(2,1,1,2,'PASSED','2026-09-25 00:00:02.100',310,2048,'identity, OS 7.9.1',NULL,NULL,'2026-09-28 08:15:11.584',6,'2026-09-28 08:15:11.584',6,0),(3,1,1,3,'PASSED','2026-09-25 00:00:02.500',1900,18944,'chassis, 1 line card, 1 optic',NULL,NULL,'2026-09-28 08:15:11.584',6,'2026-09-28 08:15:11.584',6,0),(4,1,1,4,'PASSED','2026-09-25 00:00:04.500',850,9216,'3 interfaces, 2 IP addresses',NULL,NULL,'2026-09-28 08:15:11.584',6,'2026-09-28 08:15:11.584',6,0),(5,1,1,5,'FAILED','2026-09-25 00:00:05.400',5000,0,NULL,'SNMP_TIMEOUT','Check the SNMP ACL for LLDP-MIB on the management VRF','2026-09-28 08:15:11.584',6,'2026-09-28 08:15:11.584',6,0),(6,1,1,6,'SKIPPED','2026-09-25 00:00:10.400',0,0,NULL,NULL,NULL,'2026-09-28 08:15:11.584',6,'2026-09-28 08:15:11.584',6,0),(7,1,1,7,'PASSED','2026-09-25 00:00:10.410',1200,4096,'1 L3VPN, 1 VRF',NULL,NULL,'2026-09-28 08:15:11.584',6,'2026-09-28 08:15:11.584',6,0),(8,1,3,1,'PASSED','2026-09-25 00:00:02.000',35,64,'reachable',NULL,NULL,'2026-09-28 08:15:11.584',6,'2026-09-28 08:15:11.584',6,0),(9,1,3,2,'FAILED','2026-09-25 00:00:02.100',9900,512,NULL,'PARSE_ERROR','Add sysObjectID 1.3.6.1.4.1.9.1.3210 to the Cisco adapter','2026-09-28 08:15:11.584',6,'2026-09-28 08:15:11.584',6,0);
/*!40000 ALTER TABLE `SCAN_STEP_RESULT` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SCAN_TARGET`
--

DROP TABLE IF EXISTS `SCAN_TARGET`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SCAN_TARGET` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `SCAN_JOB_ID_FK` int unsigned NOT NULL COMMENT 'FK SCAN_JOB.ID',
  `IP_ADDRESS` varchar(45) DEFAULT NULL COMMENT 'Target address (collector sources)',
  `IP_ADDRESS_BINARY` varbinary(16) GENERATED ALWAYS AS (inet6_aton(`IP_ADDRESS`)) STORED COMMENT 'Derived canonical binary address; target uniqueness uses it',
  `EXTERNAL_TARGET_ID` varchar(128) DEFAULT NULL COMMENT 'Object id in the source system (EMS / NMS NE id) for API sources',
  `HOST_NAME` varchar(253) DEFAULT NULL COMMENT 'sysName as last reported; NULL when unresolved',
  `NETWORK_ELEMENT_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK NETWORK_ELEMENT.ID matched by the identity rules; NULL = no record (rogue / unclaimed)',
  `OBSERVED_VENDOR_ID_FK` smallint unsigned DEFAULT NULL COMMENT 'FK VENDOR.ID as reported by the device',
  `OBSERVED_MODEL` varchar(64) DEFAULT NULL COMMENT 'Model as reported (raw sysDescr string)',
  `IS_ACTIVE` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Discovery flag: 0 = excluded from polling',
  `FIRST_SEEN_TIME` datetime(3) DEFAULT NULL COMMENT 'First answer (UTC); "new this cycle" is derived',
  `LAST_SYNC_TIME` datetime(3) DEFAULT NULL COMMENT 'Last completed run on this target (UTC); freshness buckets are derived',
  `LAST_OUTCOME` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Outcome of the latest run. Values: EXACT_MATCH, DRIFTED, STALE, MISSING, ROGUE, UNCLAIMED, NO_ADAPTER',
  `LAST_FAILURE_REASON` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Failure of the latest run, if any. Values: HOST_UNREACHABLE, SNMP_TIMEOUT, AUTH_FAILED, PARSE_ERROR, NO_ADAPTER, DUPLICATE_IP',
  `CONSECUTIVE_FAILED_RUNS` smallint unsigned NOT NULL DEFAULT '0' COMMENT 'Runs in a row without an answer; 3 = missing',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_SCAN_TARGET__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_SCAN_TARGET__SCAN_JOB_ID_IP_ADDRESS_BINARY` (`CUSTOMER_ID`,`IP_ADDRESS_BINARY`,`SCAN_JOB_ID_FK`),
  UNIQUE KEY `UK_SCAN_TARGET__SCAN_JOB_ID_EXTERNAL_TARGET_ID` (`CUSTOMER_ID`,`EXTERNAL_TARGET_ID`,`SCAN_JOB_ID_FK`),
  KEY `IDX_SCAN_TARGET__SCAN_JOB_ID_FK` (`CUSTOMER_ID`,`SCAN_JOB_ID_FK`),
  KEY `IDX_SCAN_TARGET__OBSERVED_VENDOR_ID` (`OBSERVED_VENDOR_ID_FK`),
  KEY `IDX_SCAN_TARGET__NETWORK_ELEMENT_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`),
  KEY `IDX_SCAN_TARGET__LAST_OUTCOME` (`CUSTOMER_ID`,`LAST_OUTCOME`),
  KEY `IDX_SCAN_TARGET__HOST_NAME` (`CUSTOMER_ID`,`HOST_NAME`),
  CONSTRAINT `FK_SCAN_TARGET__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_SCAN_TARGET__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_SCAN_TARGET__OBSERVED_VENDOR_ID` FOREIGN KEY (`OBSERVED_VENDOR_ID_FK`) REFERENCES `VENDOR` (`ID`),
  CONSTRAINT `FK_SCAN_TARGET__SCAN_JOB_ID` FOREIGN KEY (`CUSTOMER_ID`, `SCAN_JOB_ID_FK`) REFERENCES `SCAN_JOB` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_SCAN_TARGET__IDENTIFIED` CHECK (((`IP_ADDRESS` is not null) or (`EXTERNAL_TARGET_ID` is not null))),
  CONSTRAINT `CK_SCAN_TARGET__IP` CHECK (((`IP_ADDRESS` is null) or is_ipv4(`IP_ADDRESS`) or is_ipv6(`IP_ADDRESS`))),
  CONSTRAINT `CK_SCAN_TARGET__LAST_FAILURE_REASON_VALUES` CHECK ((`LAST_FAILURE_REASON` in (_utf8mb4'HOST_UNREACHABLE',_utf8mb4'SNMP_TIMEOUT',_utf8mb4'AUTH_FAILED',_utf8mb4'PARSE_ERROR',_utf8mb4'NO_ADAPTER',_utf8mb4'DUPLICATE_IP'))),
  CONSTRAINT `CK_SCAN_TARGET__LAST_OUTCOME_VALUES` CHECK ((`LAST_OUTCOME` in (_utf8mb4'EXACT_MATCH',_utf8mb4'DRIFTED',_utf8mb4'STALE',_utf8mb4'MISSING',_utf8mb4'ROGUE',_utf8mb4'UNCLAIMED',_utf8mb4'NO_ADAPTER')))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Address a job polls (gateway IP). Identity is the IP, not the hostname (109 targets have none). Carries the latest outcome as a cache. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SCAN_TARGET`
--

LOCK TABLES `SCAN_TARGET` WRITE;
/*!40000 ALTER TABLE `SCAN_TARGET` DISABLE KEYS */;
INSERT INTO `SCAN_TARGET` (`ID`, `CUSTOMER_ID`, `SCAN_JOB_ID_FK`, `IP_ADDRESS`, `EXTERNAL_TARGET_ID`, `HOST_NAME`, `NETWORK_ELEMENT_ID_FK`, `OBSERVED_VENDOR_ID_FK`, `OBSERVED_MODEL`, `IS_ACTIVE`, `FIRST_SEEN_TIME`, `LAST_SYNC_TIME`, `LAST_OUTCOME`, `LAST_FAILURE_REASON`, `CONSECUTIVE_FAILED_RUNS`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`) VALUES (1,1,1,'10.20.7.1',NULL,'BLR-AGG-R07',1,1,'ASR-9906',1,'2025-11-02 12:00:00.000','2026-09-25 01:58:03.000','EXACT_MATCH',NULL,0,'2026-09-28 08:15:11.581',6,'2026-09-28 08:15:11.581',6,0),(2,1,1,'10.20.7.2',NULL,'BLR-CO-SW01',2,1,'N9K-C93180YC-FX',1,'2025-11-02 12:00:00.000','2026-09-25 01:58:05.000','EXACT_MATCH',NULL,0,'2026-09-28 08:15:11.581',6,'2026-09-28 08:15:11.581',6,0),(3,1,1,'10.20.7.99',NULL,NULL,NULL,1,'C9200L-24T',1,'2026-09-24 18:00:00.000','2026-09-25 01:58:07.000','ROGUE',NULL,0,'2026-09-28 08:15:11.581',6,'2026-09-28 08:15:11.581',6,0),(4,1,1,'10.20.7.3',NULL,NULL,NULL,NULL,NULL,1,'2026-09-01 00:00:00.000','2026-09-25 01:58:09.000',NULL,'HOST_UNREACHABLE',3,'2026-09-28 08:15:11.581',6,'2026-09-28 08:15:11.581',6,0),(5,1,2,NULL,'ENM:BLR-277-GNB','BLR-277-GNB',4,2,'Baseband 6630',1,'2024-05-12 10:00:00.000','2026-09-25 03:00:00.000','DRIFTED',NULL,0,'2026-09-28 08:15:11.581',6,'2026-09-28 08:15:11.581',6,0);
/*!40000 ALTER TABLE `SCAN_TARGET` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SERVICE_ENDPOINT`
--

DROP TABLE IF EXISTS `SERVICE_ENDPOINT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SERVICE_ENDPOINT` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `SERVICE_INSTANCE_ID_FK` int unsigned NOT NULL COMMENT 'FK SERVICE_INSTANCE.ID',
  `ENDPOINT_ROLE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Role of the termination. Values: PE, CE, UNI, NNI, SOURCE, DESTINATION',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID',
  `PORT_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK PORT.ID: interface / sub-interface (FortyGigE0/0/0/28.100); must belong to the endpoint device',
  `IP_ADDRESS` varchar(45) DEFAULT NULL COMMENT 'Service address on the termination',
  `ADMIN_STATUS` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Admin status at this end. Values: UP, DOWN',
  `OPERATIONAL_STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'UNKNOWN' COMMENT 'Oper status at this end. Values: UP, DOWN, UNKNOWN',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_SERVICE_ENDPOINT__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_SERVICE_ENDPOINT__SERVICE_NETWORK_ELEMENT_PORT_ROLE` (`CUSTOMER_ID`,`ENDPOINT_ROLE`,`SERVICE_INSTANCE_ID_FK`,`NETWORK_ELEMENT_ID_FK`,`PORT_ID_FK`),
  KEY `IDX_SERVICE_ENDPOINT__NETWORK_ELEMENT_ID_FK` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`),
  KEY `IDX_SERVICE_ENDPOINT__NETWORK_ELEMENT_ID_PORT_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`PORT_ID_FK`),
  KEY `IDX_SERVICE_ENDPOINT__SERVICE_INSTANCE_ID_ENDPOINT_ROLE` (`CUSTOMER_ID`,`SERVICE_INSTANCE_ID_FK`,`ENDPOINT_ROLE`),
  CONSTRAINT `FK_SERVICE_ENDPOINT__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_SERVICE_ENDPOINT__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_SERVICE_ENDPOINT__NETWORK_ELEMENT_ID_PORT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `PORT_ID_FK`) REFERENCES `PORT` (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`, `ID`),
  CONSTRAINT `FK_SERVICE_ENDPOINT__SERVICE_INSTANCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `SERVICE_INSTANCE_ID_FK`) REFERENCES `SERVICE_INSTANCE` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `CK_SERVICE_ENDPOINT__ADMIN_STATUS_VALUES` CHECK ((`ADMIN_STATUS` in (_utf8mb4'UP',_utf8mb4'DOWN'))),
  CONSTRAINT `CK_SERVICE_ENDPOINT__ENDPOINT_ROLE_VALUES` CHECK ((`ENDPOINT_ROLE` in (_utf8mb4'PE',_utf8mb4'CE',_utf8mb4'UNI',_utf8mb4'NNI',_utf8mb4'SOURCE',_utf8mb4'DESTINATION'))),
  CONSTRAINT `CK_SERVICE_ENDPOINT__IP` CHECK (((`IP_ADDRESS` is null) or is_ipv4(`IP_ADDRESS`) or is_ipv6(`IP_ADDRESS`))),
  CONSTRAINT `CK_SERVICE_ENDPOINT__OPERATIONAL_STATUS_VALUES` CHECK ((`OPERATIONAL_STATUS` in (_utf8mb4'UP',_utf8mb4'DOWN',_utf8mb4'UNKNOWN')))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Termination of a service on a device interface (PE for L3VPN; source and destination for point-to-point services). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SERVICE_ENDPOINT`
--

LOCK TABLES `SERVICE_ENDPOINT` WRITE;
/*!40000 ALTER TABLE `SERVICE_ENDPOINT` DISABLE KEYS */;
INSERT INTO `SERVICE_ENDPOINT` VALUES (1,1,1,'PE',1,2,'192.168.10.1','UP','UP','2026-09-28 08:15:11.570',6,'2026-09-28 08:15:11.570',6,0),(2,1,2,'SOURCE',4,NULL,'10.40.27.7','UP','UP','2026-09-28 08:15:11.570',2,'2026-09-28 08:15:11.570',2,0),(3,1,2,'DESTINATION',1,1,'10.20.7.1','UP','UP','2026-09-28 08:15:11.570',2,'2026-09-28 08:15:11.570',2,0);
/*!40000 ALTER TABLE `SERVICE_ENDPOINT` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SERVICE_INSTANCE`
--

DROP TABLE IF EXISTS `SERVICE_INSTANCE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SERVICE_INSTANCE` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID: this row''s supertype row (identity for relationships, external refs, attributes, reconciliation)',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'SERVICE' COMMENT 'Constant SERVICE: FK-bound to RESOURCE so the supertype row is of this type',
  `SERVICE_TYPE` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'SERVICE_TYPE.CODE',
  `DOMAIN_ID_FK` smallint unsigned NOT NULL COMMENT 'FK DOMAIN.ID: network domain',
  `NAME` varchar(150) NOT NULL COMMENT 'Service name; unique per type among active services',
  `STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'UNKNOWN' COMMENT 'Operational status. Values: UP, DOWN, DEGRADED, UNKNOWN',
  `REFERENCE_KIND` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'What REFERENCE_VALUE holds. Values: ERP_NUMBER, BEARER_ID, INTERFACE_ID, WAVELENGTH_NM, CIRCUIT_ID, APN_ID, SESSION_ID, VC_ID',
  `REFERENCE_VALUE` varchar(64) DEFAULT NULL COMMENT 'Business reference (ERP 1097, VC id, wavelength ...)',
  `CUSTOMER_REFERENCE` varchar(100) DEFAULT NULL COMMENT 'Customer account reference (owned by CRM)',
  `BANDWIDTH_MBPS` int unsigned DEFAULT NULL COMMENT 'Contracted bandwidth, Mbps',
  `RECORD_SOURCE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'DISCOVERED' COMMENT 'How the record entered inventory. Values: DISCOVERED, PLANNED_CIQ, MANUAL, EMS, EXTERNAL_SYNC',
  `LAST_SEEN_TIME` datetime(3) DEFAULT NULL COMMENT 'Last discovery that confirmed it (UTC)',
  `RECORD_STATE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'ACTIVE' COMMENT 'INACTIVE = retired. Values: ACTIVE, INACTIVE',
  `INACTIVE_TIME` datetime(3) DEFAULT NULL COMMENT 'When it went inactive (UTC)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  `ACTIVE_FLAG` tinyint(1) GENERATED ALWAYS AS (if((`RECORD_STATE` = _utf8mb4'ACTIVE'),1,NULL)) STORED COMMENT '1 while ACTIVE, NULL once INACTIVE: UNIQUE keys ending in ACTIVE_FLAG ignore retired rows',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_SERVICE_INSTANCE__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_SERVICE_INSTANCE__RESOURCE_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`RESOURCE_TYPE`),
  UNIQUE KEY `UK_SERVICE_INSTANCE__SERVICE_TYPE_NAME` (`CUSTOMER_ID`,`SERVICE_TYPE`,`NAME`,`ACTIVE_FLAG`),
  KEY `IDX_SERVICE_INSTANCE__SERVICE_TYPE` (`SERVICE_TYPE`),
  KEY `IDX_SERVICE_INSTANCE__SERVICE_TYPE_STATUS` (`CUSTOMER_ID`,`SERVICE_TYPE`,`STATUS`),
  KEY `IDX_SERVICE_INSTANCE__REFERENCE_VALUE` (`CUSTOMER_ID`,`REFERENCE_VALUE`),
  KEY `IDX_SERVICE_INSTANCE__DOMAIN_ID` (`DOMAIN_ID_FK`),
  CONSTRAINT `FK_SERVICE_INSTANCE__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_SERVICE_INSTANCE__DOMAIN_ID` FOREIGN KEY (`DOMAIN_ID_FK`) REFERENCES `DOMAIN` (`ID`),
  CONSTRAINT `FK_SERVICE_INSTANCE__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `FK_SERVICE_INSTANCE__SERVICE_TYPE` FOREIGN KEY (`SERVICE_TYPE`) REFERENCES `SERVICE_TYPE` (`CODE`),
  CONSTRAINT `CK_SERVICE_INSTANCE__INACTIVE` CHECK (((`RECORD_STATE` = _utf8mb4'INACTIVE') = (`INACTIVE_TIME` is not null))),
  CONSTRAINT `CK_SERVICE_INSTANCE__RECORD_SOURCE_VALUES` CHECK ((`RECORD_SOURCE` in (_utf8mb4'DISCOVERED',_utf8mb4'PLANNED_CIQ',_utf8mb4'MANUAL',_utf8mb4'EMS',_utf8mb4'EXTERNAL_SYNC'))),
  CONSTRAINT `CK_SERVICE_INSTANCE__RECORD_STATE_VALUES` CHECK ((`RECORD_STATE` in (_utf8mb4'ACTIVE',_utf8mb4'INACTIVE'))),
  CONSTRAINT `CK_SERVICE_INSTANCE__REFERENCE` CHECK (((`REFERENCE_KIND` is null) = (`REFERENCE_VALUE` is null))),
  CONSTRAINT `CK_SERVICE_INSTANCE__REFERENCE_KIND_VALUES` CHECK ((`REFERENCE_KIND` in (_utf8mb4'ERP_NUMBER',_utf8mb4'BEARER_ID',_utf8mb4'INTERFACE_ID',_utf8mb4'WAVELENGTH_NM',_utf8mb4'CIRCUIT_ID',_utf8mb4'APN_ID',_utf8mb4'SESSION_ID',_utf8mb4'VC_ID'))),
  CONSTRAINT `CK_SERVICE_INSTANCE__RESOURCE_TYPE` CHECK ((`RESOURCE_TYPE` = _utf8mb4'SERVICE')),
  CONSTRAINT `CK_SERVICE_INSTANCE__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'UP',_utf8mb4'DOWN',_utf8mb4'DEGRADED',_utf8mb4'UNKNOWN')))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Network service instance, unique per type and name among active services. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SERVICE_INSTANCE`
--

LOCK TABLES `SERVICE_INSTANCE` WRITE;
/*!40000 ALTER TABLE `SERVICE_INSTANCE` DISABLE KEYS */;
INSERT INTO `SERVICE_INSTANCE` (`ID`, `CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`, `SERVICE_TYPE`, `DOMAIN_ID_FK`, `NAME`, `STATUS`, `REFERENCE_KIND`, `REFERENCE_VALUE`, `CUSTOMER_REFERENCE`, `BANDWIDTH_MBPS`, `RECORD_SOURCE`, `LAST_SEEN_TIME`, `RECORD_STATE`, `INACTIVE_TIME`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`) VALUES (1,1,28,'SERVICE','L3VPN',4,'ACME-L3VPN-BLR','UP','CIRCUIT_ID','CKT-10021','ACME Ltd',1000,'DISCOVERED','2026-09-25 01:58:03.000','ACTIVE',NULL,'2026-09-28 08:15:11.569',6,'2026-09-28 08:15:11.569',6,0),(2,1,29,'SERVICE','MOBILE_BACKHAUL',3,'BLR-277 backhaul','UP',NULL,NULL,NULL,10000,'MANUAL',NULL,'ACTIVE',NULL,'2026-09-28 08:15:11.569',2,'2026-09-28 08:15:11.569',2,0);
/*!40000 ALTER TABLE `SERVICE_INSTANCE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SERVICE_TYPE`
--

DROP TABLE IF EXISTS `SERVICE_TYPE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SERVICE_TYPE` (
  `ID` smallint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK (catalog)',
  `CODE` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Service type code',
  `NAME` varchar(64) NOT NULL COMMENT 'Display name',
  `DOMAIN_ID_FK` smallint unsigned NOT NULL COMMENT 'FK DOMAIN.ID: domain the service type belongs to',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_SERVICE_TYPE__CODE` (`CODE`),
  KEY `IDX_SERVICE_TYPE__DOMAIN_ID` (`DOMAIN_ID_FK`),
  CONSTRAINT `FK_SERVICE_TYPE__DOMAIN_ID` FOREIGN KEY (`DOMAIN_ID_FK`) REFERENCES `DOMAIN` (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Network service type catalog. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SERVICE_TYPE`
--

LOCK TABLES `SERVICE_TYPE` WRITE;
/*!40000 ALTER TABLE `SERVICE_TYPE` DISABLE KEYS */;
INSERT INTO `SERVICE_TYPE` VALUES (1,'L3VPN','L3VPN',4),(2,'L2VPN_VPWS','L2VPN point-to-point (VPWS)',4),(3,'L2VPN_VPLS','L2VPN multipoint (VPLS)',4),(4,'EVPN','EVPN',4),(5,'INTERNET_ACCESS','Internet access',4),(6,'MOBILE_BACKHAUL','Mobile backhaul',3),(7,'ETHERNET_CIRCUIT','Ethernet circuit',3),(8,'WAVELENGTH','Wavelength',5),(9,'OTN_CIRCUIT','OTN circuit',5),(10,'MICROWAVE_CIRCUIT','Microwave circuit',6),(11,'APN_DNN','APN / DNN',2),(12,'VOICE','Voice (IMS)',2);
/*!40000 ALTER TABLE `SERVICE_TYPE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SITE`
--

DROP TABLE IF EXISTS `SITE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SITE` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `CODE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Site / location id shown in the UI (BGLK-277, DEL-279)',
  `NAME` varchar(150) NOT NULL COMMENT 'Site name',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID: this row''s supertype row (identity for relationships, external refs, attributes, reconciliation)',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'SITE' COMMENT 'Constant SITE: FK-bound to RESOURCE so the supertype row is of this type',
  `SITE_TYPE_ID_FK` smallint unsigned NOT NULL COMMENT 'FK SITE_TYPE.ID',
  `CATEGORY` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Network tier of the site (Central / Regional / Edge). Values: CENTRAL, REGIONAL, EDGE, ACCESS',
  `STATUS` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'PLANNED' COMMENT 'Site lifecycle status. Values: PLANNED, IN_PROGRESS, ON_AIR, FAILED, DECOMMISSIONED',
  `PARENT_SITE_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK SITE.ID: parent site (a POP inside a central office); NULL at the top',
  `GEOGRAPHY_LEVEL4_ID_FK` int unsigned NOT NULL COMMENT 'FK GEOGRAPHY_LEVEL4.ID: lowest administrative area; levels 1-3 are derived through the chain by the API',
  `OPERATIONAL_AREA_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK OPERATIONAL_AREA.ID: lowest operational area that owns the site',
  `ADDRESS` varchar(255) DEFAULT NULL COMMENT 'Street address',
  `POSTAL_CODE` varchar(10) DEFAULT NULL COMMENT 'PIN / postal code',
  `LATITUDE` decimal(9,6) DEFAULT NULL COMMENT 'Site latitude (WGS84)',
  `LONGITUDE` decimal(9,6) DEFAULT NULL COMMENT 'Site longitude (WGS84)',
  `ENVIRONMENT` varchar(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Where the equipment sits (cell type is NETWORK_ELEMENT_RAN_DETAIL.DEPLOYMENT_TYPE, morphology is GEOGRAPHY_LEVEL4). Values: INDOOR, OUTDOOR, MIXED',
  `ROLLOUT_STAGE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Rollout stage while the site is being built. Values: COMMISSIONED, UNDER_DEPLOYMENT, ATP_PENDING, INTEGRATION_PENDING, BLOCKED',
  `LANDLORD` varchar(150) DEFAULT NULL COMMENT 'Landlord / property owner',
  `LEASE_END_DATE` date DEFAULT NULL COMMENT 'Lease expiry; "lease expires within 30 days" risk is derived',
  `WORK_ORDER_REFERENCE` varchar(40) DEFAULT NULL COMMENT 'Work order that created / last changed the site (external reference)',
  `ON_AIR_DATE` date DEFAULT NULL COMMENT 'Date the site went on air',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  `IS_DELETED` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Soft-delete flag (0 = active, 1 = deleted)',
  `LIVE_FLAG` tinyint(1) GENERATED ALWAYS AS (if((`IS_DELETED` = 0),1,NULL)) STORED COMMENT '1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_SITE__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_SITE__RESOURCE_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`RESOURCE_TYPE`),
  UNIQUE KEY `UK_SITE__CODE` (`CUSTOMER_ID`,`CODE`,`LIVE_FLAG`),
  KEY `IDX_SITE__OPERATIONAL_AREA_ID` (`CUSTOMER_ID`,`OPERATIONAL_AREA_ID_FK`),
  KEY `IDX_SITE__GEOGRAPHY_LEVEL4_ID` (`CUSTOMER_ID`,`GEOGRAPHY_LEVEL4_ID_FK`),
  KEY `IDX_SITE__SITE_TYPE_ID` (`SITE_TYPE_ID_FK`),
  KEY `IDX_SITE__STATUS_CATEGORY` (`CUSTOMER_ID`,`STATUS`,`CATEGORY`),
  KEY `IDX_SITE__PARENT_SITE_ID` (`CUSTOMER_ID`,`PARENT_SITE_ID_FK`),
  KEY `IDX_SITE__NAME` (`CUSTOMER_ID`,`NAME`),
  CONSTRAINT `FK_SITE__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_SITE__GEOGRAPHY_LEVEL4_ID` FOREIGN KEY (`CUSTOMER_ID`, `GEOGRAPHY_LEVEL4_ID_FK`) REFERENCES `GEOGRAPHY_LEVEL4` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_SITE__OPERATIONAL_AREA_ID` FOREIGN KEY (`CUSTOMER_ID`, `OPERATIONAL_AREA_ID_FK`) REFERENCES `OPERATIONAL_AREA` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_SITE__PARENT_SITE_ID` FOREIGN KEY (`CUSTOMER_ID`, `PARENT_SITE_ID_FK`) REFERENCES `SITE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_SITE__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `FK_SITE__SITE_TYPE_ID` FOREIGN KEY (`SITE_TYPE_ID_FK`) REFERENCES `SITE_TYPE` (`ID`),
  CONSTRAINT `CK_SITE__CATEGORY_VALUES` CHECK ((`CATEGORY` in (_utf8mb4'CENTRAL',_utf8mb4'REGIONAL',_utf8mb4'EDGE',_utf8mb4'ACCESS'))),
  CONSTRAINT `CK_SITE__ENVIRONMENT_VALUES` CHECK ((`ENVIRONMENT` in (_utf8mb4'INDOOR',_utf8mb4'OUTDOOR',_utf8mb4'MIXED'))),
  CONSTRAINT `CK_SITE__LAT_LONG` CHECK ((((`LATITUDE` is null) = (`LONGITUDE` is null)) and ((`LATITUDE` is null) or ((`LATITUDE` between -(90) and 90) and (`LONGITUDE` between -(180) and 180))))),
  CONSTRAINT `CK_SITE__RESOURCE_TYPE` CHECK ((`RESOURCE_TYPE` = _utf8mb4'SITE')),
  CONSTRAINT `CK_SITE__ROLLOUT_STAGE_VALUES` CHECK ((`ROLLOUT_STAGE` in (_utf8mb4'COMMISSIONED',_utf8mb4'UNDER_DEPLOYMENT',_utf8mb4'ATP_PENDING',_utf8mb4'INTEGRATION_PENDING',_utf8mb4'BLOCKED'))),
  CONSTRAINT `CK_SITE__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'PLANNED',_utf8mb4'IN_PROGRESS',_utf8mb4'ON_AIR',_utf8mb4'FAILED',_utf8mb4'DECOMMISSIONED')))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='A location that hosts equipment (central office, POP, tower, data centre). Geography is held once (lowest level only); lat/long once. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SITE`
--

LOCK TABLES `SITE` WRITE;
/*!40000 ALTER TABLE `SITE` DISABLE KEYS */;
INSERT INTO `SITE` (`ID`, `CUSTOMER_ID`, `CODE`, `NAME`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`, `SITE_TYPE_ID_FK`, `CATEGORY`, `STATUS`, `PARENT_SITE_ID_FK`, `GEOGRAPHY_LEVEL4_ID_FK`, `OPERATIONAL_AREA_ID_FK`, `ADDRESS`, `POSTAL_CODE`, `LATITUDE`, `LONGITUDE`, `ENVIRONMENT`, `ROLLOUT_STAGE`, `LANDLORD`, `LEASE_END_DATE`, `WORK_ORDER_REFERENCE`, `ON_AIR_DATE`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`, `IS_DELETED`) VALUES (1,1,'KA-BGLK-277','Koramangala tower',1,'SITE',1,'ACCESS','ON_AIR',NULL,1,3,'4th Block, Koramangala','560034',12.934500,77.626600,'OUTDOOR','COMMISSIONED','Prestige Estates','2029-03-31',NULL,'2024-05-12','2026-09-28 08:15:11.537',1,'2026-09-28 08:15:11.537',1,0,0),(2,1,'KA-BLRW-101','Whitefield central office',2,'SITE',2,'REGIONAL','ON_AIR',NULL,2,3,'EPIP Zone, Whitefield','560066',12.984900,77.728900,'INDOOR','COMMISSIONED',NULL,NULL,NULL,'2019-11-01','2026-09-28 08:15:11.537',1,'2026-09-28 08:15:11.537',1,0,0),(3,1,'KA-BLRD-001','Bengaluru edge data centre',3,'SITE',3,'CENTRAL','ON_AIR',NULL,2,3,'ITPL Main Road, Whitefield','560066',12.987300,77.736400,'INDOOR','COMMISSIONED',NULL,NULL,NULL,'2022-08-15','2026-09-28 08:15:11.537',1,'2026-09-28 08:15:11.537',1,0,0);
/*!40000 ALTER TABLE `SITE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SITE_CONTACT`
--

DROP TABLE IF EXISTS `SITE_CONTACT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SITE_CONTACT` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `SITE_ID_FK` int unsigned NOT NULL COMMENT 'FK SITE.ID',
  `CONTACT_ROLE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Role of the contact at the site. Values: SITE_OWNER, LANDLORD, FIELD_ENGINEER, SECURITY, OTHER',
  `CONTACT_NAME` varchar(150) NOT NULL COMMENT 'Contact name',
  `PHONE_ENCRYPTED` varbinary(256) DEFAULT NULL COMMENT 'AES-256-CBC(phone E.164) with PHONE_ENCRYPTION_IV',
  `PHONE_ENCRYPTION_IV` varbinary(16) DEFAULT NULL COMMENT 'Per-row initialisation vector of PHONE_ENCRYPTED',
  `EMAIL_ENCRYPTED` varbinary(512) DEFAULT NULL COMMENT 'AES-256-CBC(email) with EMAIL_ENCRYPTION_IV',
  `EMAIL_ENCRYPTION_IV` varbinary(16) DEFAULT NULL COMMENT 'Per-row initialisation vector of EMAIL_ENCRYPTED',
  `ENCRYPTION_KEY_REFERENCE` varchar(64) DEFAULT NULL COMMENT 'Vault key id used for PHONE_ENCRYPTED / EMAIL_ENCRYPTED',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_SITE_CONTACT__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  KEY `IDX_SITE_CONTACT__SITE_ID_CONTACT_ROLE` (`CUSTOMER_ID`,`SITE_ID_FK`,`CONTACT_ROLE`),
  CONSTRAINT `FK_SITE_CONTACT__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_SITE_CONTACT__SITE_ID` FOREIGN KEY (`CUSTOMER_ID`, `SITE_ID_FK`) REFERENCES `SITE` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `CK_SITE_CONTACT__CONTACT_ROLE_VALUES` CHECK ((`CONTACT_ROLE` in (_utf8mb4'SITE_OWNER',_utf8mb4'LANDLORD',_utf8mb4'FIELD_ENGINEER',_utf8mb4'SECURITY',_utf8mb4'OTHER'))),
  CONSTRAINT `CK_SITE_CONTACT__IV` CHECK ((((`PHONE_ENCRYPTED` is null) = (`PHONE_ENCRYPTION_IV` is null)) and ((`EMAIL_ENCRYPTED` is null) = (`EMAIL_ENCRYPTION_IV` is null)))),
  CONSTRAINT `CK_SITE_CONTACT__KEY_REFERENCE` CHECK ((((`PHONE_ENCRYPTED` is null) and (`EMAIL_ENCRYPTED` is null)) = (`ENCRYPTION_KEY_REFERENCE` is null)))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Site contact person (from NETWORK_ELEMENT_DETAIL). Phone and email are personal data: stored AES-encrypted. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SITE_CONTACT`
--

LOCK TABLES `SITE_CONTACT` WRITE;
/*!40000 ALTER TABLE `SITE_CONTACT` DISABLE KEYS */;
INSERT INTO `SITE_CONTACT` VALUES (1,1,1,'FIELD_ENGINEER','Ravi Shankar',NULL,NULL,NULL,NULL,NULL,'2026-09-28 08:15:11.540',1,'2026-09-28 08:15:11.540',1,0),(2,1,1,'LANDLORD','Prestige Estates facilities desk',NULL,NULL,NULL,NULL,NULL,'2026-09-28 08:15:11.540',1,'2026-09-28 08:15:11.540',1,0);
/*!40000 ALTER TABLE `SITE_CONTACT` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SITE_ISSUE`
--

DROP TABLE IF EXISTS `SITE_ISSUE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SITE_ISSUE` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `SITE_ID_FK` int unsigned NOT NULL COMMENT 'FK SITE.ID',
  `ISSUE_KIND` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'BLOCKER stops rollout; RISK is a standing flag. Values: BLOCKER, RISK',
  `CATEGORY` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Issue category. Values: LEASE_PROPERTY, POWER, FIBER_CONNECTIVITY, CIVIL_INFRASTRUCTURE, REGULATORY, SUPPLY_CHAIN, COMMISSIONING, CAPACITY',
  `REASON` varchar(150) NOT NULL COMMENT 'Reason (Lease agreement expired, ATP pending ...)',
  `RAISED_TIME` datetime(3) NOT NULL COMMENT 'When raised (UTC)',
  `RESOLVED_TIME` datetime(3) DEFAULT NULL COMMENT 'When resolved (UTC); NULL = open',
  `OWNER_TEAM_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK TEAM.ID: team that owns the resolution',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_SITE_ISSUE__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  KEY `IDX_SITE_ISSUE__OWNER_TEAM_ID` (`CUSTOMER_ID`,`OWNER_TEAM_ID_FK`),
  KEY `IDX_SITE_ISSUE__SITE_ID_FK` (`CUSTOMER_ID`,`SITE_ID_FK`),
  KEY `IDX_SITE_ISSUE__SITE_ID_RESOLVED_TIME` (`CUSTOMER_ID`,`SITE_ID_FK`,`RESOLVED_TIME`),
  CONSTRAINT `FK_SITE_ISSUE__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_SITE_ISSUE__OWNER_TEAM_ID` FOREIGN KEY (`CUSTOMER_ID`, `OWNER_TEAM_ID_FK`) REFERENCES `TEAM` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_SITE_ISSUE__SITE_ID` FOREIGN KEY (`CUSTOMER_ID`, `SITE_ID_FK`) REFERENCES `SITE` (`CUSTOMER_ID`, `ID`) ON DELETE CASCADE,
  CONSTRAINT `CK_SITE_ISSUE__CATEGORY_VALUES` CHECK ((`CATEGORY` in (_utf8mb4'LEASE_PROPERTY',_utf8mb4'POWER',_utf8mb4'FIBER_CONNECTIVITY',_utf8mb4'CIVIL_INFRASTRUCTURE',_utf8mb4'REGULATORY',_utf8mb4'SUPPLY_CHAIN',_utf8mb4'COMMISSIONING',_utf8mb4'CAPACITY'))),
  CONSTRAINT `CK_SITE_ISSUE__ISSUE_KIND_VALUES` CHECK ((`ISSUE_KIND` in (_utf8mb4'BLOCKER',_utf8mb4'RISK'))),
  CONSTRAINT `CK_SITE_ISSUE__RESOLVED` CHECK (((`RESOLVED_TIME` is null) or (`RESOLVED_TIME` >= `RAISED_TIME`)))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Rollout blocker or standing risk at a site (Lease / Property, Power, Fiber Connectivity, Civil, Regulatory, Supply Chain, Commissioning). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SITE_ISSUE`
--

LOCK TABLES `SITE_ISSUE` WRITE;
/*!40000 ALTER TABLE `SITE_ISSUE` DISABLE KEYS */;
INSERT INTO `SITE_ISSUE` VALUES (1,1,1,'RISK','POWER','Diesel supply contract expires 2026-12-31','2026-09-10 09:00:00.000',NULL,2,'2026-09-28 08:15:11.540',1,'2026-09-28 08:15:11.540',1,0);
/*!40000 ALTER TABLE `SITE_ISSUE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SITE_TYPE`
--

DROP TABLE IF EXISTS `SITE_TYPE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SITE_TYPE` (
  `ID` smallint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK (metadata table)',
  `CODE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Site type code',
  `NAME` varchar(100) NOT NULL COMMENT 'Display name',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_SITE_TYPE__CODE` (`CODE`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Site type (Central office, Regional hub, Edge, Tower, Data centre ...). [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SITE_TYPE`
--

LOCK TABLES `SITE_TYPE` WRITE;
/*!40000 ALTER TABLE `SITE_TYPE` DISABLE KEYS */;
INSERT INTO `SITE_TYPE` VALUES (1,'TOWER','Tower'),(2,'CENTRAL_OFFICE','Central office'),(3,'DATA_CENTRE','Data centre');
/*!40000 ALTER TABLE `SITE_TYPE` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `TEAM`
--

DROP TABLE IF EXISTS `TEAM`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TEAM` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `CODE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Team code',
  `NAME` varchar(100) NOT NULL COMMENT 'Team name',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp; users are never hard-deleted)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  `IS_DELETED` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Soft-delete flag (0 = active, 1 = deleted)',
  `LIVE_FLAG` tinyint(1) GENERATED ALWAYS AS (if((`IS_DELETED` = 0),1,NULL)) STORED COMMENT '1 while active, NULL once deleted: UNIQUE keys ending in LIVE_FLAG ignore deleted rows',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_TEAM__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_TEAM__CODE` (`CUSTOMER_ID`,`CODE`,`LIVE_FLAG`),
  CONSTRAINT `FK_TEAM__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Reference copy of a User Management group used as owner queue of an exception, exception-reviewer team of a rule and owner of a site issue; rows arrive by CDC and are never created here. "Unassigned" is the absence of a team. [v6, 2026-09-28]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `TEAM`
--

LOCK TABLES `TEAM` WRITE;
/*!40000 ALTER TABLE `TEAM` DISABLE KEYS */;
INSERT INTO `TEAM` (`ID`, `CUSTOMER_ID`, `CODE`, `NAME`, `CREATED_TIME`, `CREATOR`, `MODIFIED_TIME`, `LAST_MODIFIER`, `ROW_VERSION`, `IS_DELETED`) VALUES (1,1,'NOC-RAN','NOC RAN','2026-09-28 08:15:11.530',1,'2026-09-28 08:15:11.530',1,0,0),(2,1,'NOC-TRANSPORT','NOC Transport','2026-09-28 08:15:11.530',1,'2026-09-28 08:15:11.530',1,0,0),(3,1,'ARCHITECTURE','Architecture','2026-09-28 08:15:11.530',1,'2026-09-28 08:15:11.530',1,0,0);
/*!40000 ALTER TABLE `TEAM` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `TECHNOLOGY`
--

DROP TABLE IF EXISTS `TECHNOLOGY`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TECHNOLOGY` (
  `ID` smallint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK (catalog)',
  `CODE` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Technology code (GSM, UMTS, LTE, NR, NB_IOT, MPLS, SR_MPLS, OTN, DWDM, XGSPON ...)',
  `NAME` varchar(50) NOT NULL COMMENT 'Display name',
  `FAMILY` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Technology family. Values: RADIO_ACCESS, CORE, PACKET_TRANSPORT, OPTICAL_TRANSPORT, MICROWAVE, FIXED_ACCESS, WIRELESS_LAN, CLOUD',
  `GENERATION` varchar(4) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Mobile generation for radio / core technologies. Values: 2G, 3G, 4G, 5G; NULL otherwise',
  `IS_ACTIVE` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1 when available for new records',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_TECHNOLOGY__CODE` (`CODE`),
  CONSTRAINT `CK_TECHNOLOGY__FAMILY_VALUES` CHECK ((`FAMILY` in (_utf8mb4'RADIO_ACCESS',_utf8mb4'CORE',_utf8mb4'PACKET_TRANSPORT',_utf8mb4'OPTICAL_TRANSPORT',_utf8mb4'MICROWAVE',_utf8mb4'FIXED_ACCESS',_utf8mb4'WIRELESS_LAN',_utf8mb4'CLOUD'))),
  CONSTRAINT `CK_TECHNOLOGY__GENERATION_FAMILY` CHECK (((`GENERATION` is null) or (`FAMILY` in (_utf8mb4'RADIO_ACCESS',_utf8mb4'CORE')))),
  CONSTRAINT `CK_TECHNOLOGY__GENERATION_VALUES` CHECK ((`GENERATION` in (_utf8mb4'2G',_utf8mb4'3G',_utf8mb4'4G',_utf8mb4'5G')))
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Network / radio access technology with family and generation; the one place generation is recorded. [v4, 2026-09-24]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `TECHNOLOGY`
--

LOCK TABLES `TECHNOLOGY` WRITE;
/*!40000 ALTER TABLE `TECHNOLOGY` DISABLE KEYS */;
INSERT INTO `TECHNOLOGY` VALUES (1,'GSM','GSM / GPRS / EDGE','RADIO_ACCESS','2G',1),(2,'UMTS','UMTS / HSPA','RADIO_ACCESS','3G',1),(3,'LTE','LTE / LTE-A','RADIO_ACCESS','4G',1),(4,'LTE_M','LTE-M','RADIO_ACCESS','4G',1),(5,'NB_IOT','NB-IoT','RADIO_ACCESS','4G',1),(6,'NR','5G NR','RADIO_ACCESS','5G',1),(7,'CS_CORE','Circuit-switched core','CORE','2G',1),(8,'EPC','Evolved Packet Core','CORE','4G',1),(9,'5GC','5G Core','CORE','5G',1),(10,'IMS','IMS','CORE',NULL,1),(11,'ETHERNET','Ethernet','PACKET_TRANSPORT',NULL,1),(12,'IP','IP routing','PACKET_TRANSPORT',NULL,1),(13,'MPLS','MPLS (LDP / RSVP-TE)','PACKET_TRANSPORT',NULL,1),(14,'SR_MPLS','Segment routing MPLS','PACKET_TRANSPORT',NULL,1),(15,'SRV6','Segment routing v6','PACKET_TRANSPORT',NULL,1),(16,'SDH','SDH','OPTICAL_TRANSPORT',NULL,1),(17,'OTN','OTN','OPTICAL_TRANSPORT',NULL,1),(18,'DWDM','DWDM','OPTICAL_TRANSPORT',NULL,1),(19,'MICROWAVE','Microwave / mm-wave radio','MICROWAVE',NULL,1),(20,'GPON','GPON','FIXED_ACCESS',NULL,1),(21,'XGSPON','XGS-PON','FIXED_ACCESS',NULL,1),(22,'WIFI','Wi-Fi','WIRELESS_LAN',NULL,1),(23,'NFV','NFV (VM)','CLOUD',NULL,1),(24,'KUBERNETES','Kubernetes (CNF)','CLOUD',NULL,1);
/*!40000 ALTER TABLE `TECHNOLOGY` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `TENANT`
--

DROP TABLE IF EXISTS `TENANT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TENANT` (
  `ID` int unsigned NOT NULL COMMENT 'Platform tenant id: the value every table stores in CUSTOMER_ID',
  `CODE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Stable tenant code',
  `NAME` varchar(128) NOT NULL COMMENT 'Tenant display name',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_TENANT__CODE` (`CODE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Platform tenant (the operator). Every tenant-owned row references it through CUSTOMER_ID. Reference copy of the platform tenant registry (CDC). [v6, 2026-09-28]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `TENANT`
--

LOCK TABLES `TENANT` WRITE;
/*!40000 ALTER TABLE `TENANT` DISABLE KEYS */;
INSERT INTO `TENANT` VALUES (1,'NETSING','NetSingularity demo operator','2026-09-28 08:15:11.528','2026-09-28 08:15:11.528');
/*!40000 ALTER TABLE `TENANT` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `USER`
--

DROP TABLE IF EXISTS `USER`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `USER` (
  `ID` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK; the value every CREATOR / LAST_MODIFIER / *_BY_FK stores',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `USERNAME` varchar(128) NOT NULL COMMENT 'Platform login name (canonical, as held by User Management)',
  `DISPLAY_NAME` varchar(128) NOT NULL COMMENT 'Name shown in the UI',
  `USER_TYPE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'HUMAN' COMMENT 'Kind of principal. Values: HUMAN, SERVICE',
  `STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'ACTIVE' COMMENT 'Account state; users are disabled, never hard-deleted. Values: ACTIVE, DISABLED',
  `DISABLED_TIME` datetime(3) DEFAULT NULL COMMENT 'When disabled (UTC)',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp; users are never hard-deleted)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_USER__USERNAME` (`CUSTOMER_ID`,`USERNAME`),
  UNIQUE KEY `UK_USER__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  CONSTRAINT `FK_USER__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `CK_USER__DISABLED` CHECK (((`STATUS` = _utf8mb4'DISABLED') = (`DISABLED_TIME` is not null))),
  CONSTRAINT `CK_USER__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'ACTIVE',_utf8mb4'DISABLED'))),
  CONSTRAINT `CK_USER__USER_TYPE_VALUES` CHECK ((`USER_TYPE` in (_utf8mb4'HUMAN',_utf8mb4'SERVICE')))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Reference copy of User Management users, kept only because 8 FK relationships need it; rows arrive by CDC (never created here). No email or other contact PII is stored. External identities stay in User Management. [v6, 2026-09-28]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `USER`
--

LOCK TABLES `USER` WRITE;
/*!40000 ALTER TABLE `USER` DISABLE KEYS */;
INSERT INTO `USER` VALUES (1,1,'system','System','SERVICE','ACTIVE',NULL,'2026-09-28 08:15:11.529',1,'2026-09-28 08:15:11.529',1,0),(2,1,'harish.kumar','Harish Kumar','HUMAN','ACTIVE',NULL,'2026-09-28 08:15:11.529',1,'2026-09-28 08:15:11.529',1,0),(3,1,'anjali.verma','Anjali Verma','HUMAN','ACTIVE',NULL,'2026-09-28 08:15:11.529',1,'2026-09-28 08:15:11.529',1,0),(4,1,'r.iyer','R. Iyer','HUMAN','ACTIVE',NULL,'2026-09-28 08:15:11.529',1,'2026-09-28 08:15:11.529',1,0),(5,1,'priya.s','Priya S.','HUMAN','ACTIVE',NULL,'2026-09-28 08:15:11.529',1,'2026-09-28 08:15:11.529',1,0),(6,1,'collector-svc','Collector service','SERVICE','ACTIVE',NULL,'2026-09-28 08:15:11.529',1,'2026-09-28 08:15:11.529',1,0);
/*!40000 ALTER TABLE `USER` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `VENDOR`
--

DROP TABLE IF EXISTS `VENDOR`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `VENDOR` (
  `ID` smallint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK (global catalog, no CUSTOMER_ID)',
  `CODE` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Vendor code (CISCO, JUNIPER, NOKIA, HUAWEI, ERICSSON ...)',
  `NAME` varchar(100) NOT NULL COMMENT 'Vendor display name',
  `SNMP_SYSTEM_OID_PREFIX` varchar(64) DEFAULT NULL COMMENT 'SNMP enterprise OID prefix used to identify the vendor from sysObjectID (1.3.6.1.4.1.2636)',
  `IS_ACTIVE` tinyint(1) NOT NULL DEFAULT '1' COMMENT '0 hides the vendor from pickers',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_VENDOR__CODE` (`CODE`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Equipment vendor / OEM (shared catalog; DDL restored from v3 because it was missing from the v4 dump). Ownership pending validation: may become a CDC copy of a master-data module. [v6, 2026-09-28]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `VENDOR`
--

LOCK TABLES `VENDOR` WRITE;
/*!40000 ALTER TABLE `VENDOR` DISABLE KEYS */;
INSERT INTO `VENDOR` VALUES (1,'CISCO','Cisco','1.3.6.1.4.1.9',1),(2,'ERICSSON','Ericsson','1.3.6.1.4.1.193',1),(3,'NOKIA','Nokia','1.3.6.1.4.1.94',1),(4,'CIENA','Ciena','1.3.6.1.4.1.1271',1),(5,'DELL','Dell','1.3.6.1.4.1.674',1),(6,'KATHREIN','Kathrein',NULL,1);
/*!40000 ALTER TABLE `VENDOR` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `VLAN`
--

DROP TABLE IF EXISTS `VLAN`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `VLAN` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID: this row''s supertype row',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'VLAN' COMMENT 'Constant VLAN: FK-bound to RESOURCE so the supertype row is of this type',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID: the switch / router the VLAN is configured on',
  `VLAN_NUMBER` smallint unsigned NOT NULL COMMENT 'VLAN id (1-4094)',
  `NAME` varchar(64) DEFAULT NULL COMMENT 'VLAN name',
  `VLAN_TYPE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'VLAN type. Values: DATA, SERVER, WIRELESS, VOICE, GUEST, MANAGEMENT',
  `STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'ACTIVE' COMMENT 'VLAN status. Values: ACTIVE, SUSPENDED',
  `RECORD_SOURCE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'DISCOVERED' COMMENT 'Origin of the row. Values: DISCOVERED, PLANNED_CIQ, MANUAL, EMS, EXTERNAL_SYNC',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_VLAN__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_VLAN__NETWORK_ELEMENT_ID_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`ID`),
  UNIQUE KEY `UK_VLAN__NETWORK_ELEMENT_ID_VLAN_NUMBER` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`VLAN_NUMBER`),
  UNIQUE KEY `UK_VLAN__RESOURCE_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`RESOURCE_TYPE`),
  CONSTRAINT `FK_VLAN__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_VLAN__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_VLAN__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `CK_VLAN__RANGE` CHECK ((`VLAN_NUMBER` between 1 and 4094)),
  CONSTRAINT `CK_VLAN__RECORD_SOURCE_VALUES` CHECK ((`RECORD_SOURCE` in (_utf8mb4'DISCOVERED',_utf8mb4'PLANNED_CIQ',_utf8mb4'MANUAL',_utf8mb4'EMS',_utf8mb4'EXTERNAL_SYNC'))),
  CONSTRAINT `CK_VLAN__RESOURCE_TYPE` CHECK ((`RESOURCE_TYPE` = _utf8mb4'VLAN')),
  CONSTRAINT `CK_VLAN__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'ACTIVE',_utf8mb4'SUSPENDED'))),
  CONSTRAINT `CK_VLAN__VLAN_TYPE_VALUES` CHECK ((`VLAN_TYPE` in (_utf8mb4'DATA',_utf8mb4'SERVER',_utf8mb4'WIRELESS',_utf8mb4'VOICE',_utf8mb4'GUEST',_utf8mb4'MANAGEMENT')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='VLAN configured on a device (RESOURCE_TYPE VLAN). DDL restored from v3 and aligned with the RESOURCE supertype because it was missing from the v4 dump. [v6, 2026-09-28]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `VLAN`
--

LOCK TABLES `VLAN` WRITE;
/*!40000 ALTER TABLE `VLAN` DISABLE KEYS */;
INSERT INTO `VLAN` VALUES (1,1,34,'VLAN',2,100,'MGMT','MANAGEMENT','ACTIVE','DISCOVERED','2026-09-28 08:15:11.557',6,'2026-09-28 08:15:11.557',6,0);
/*!40000 ALTER TABLE `VLAN` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `VRF`
--

DROP TABLE IF EXISTS `VRF`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `VRF` (
  `ID` int unsigned NOT NULL AUTO_INCREMENT COMMENT 'Surrogate PK',
  `CUSTOMER_ID` int unsigned NOT NULL COMMENT 'Platform tenant (TENANT.ID); every FK between tenant tables includes it',
  `RESOURCE_ID_FK` bigint unsigned NOT NULL COMMENT 'FK RESOURCE.ID: this row''s supertype row',
  `RESOURCE_TYPE` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'VRF' COMMENT 'Constant VRF: FK-bound to RESOURCE so the supertype row is of this type',
  `NETWORK_ELEMENT_ID_FK` int unsigned NOT NULL COMMENT 'FK NETWORK_ELEMENT.ID: the router the VRF is configured on',
  `NAME` varchar(64) NOT NULL COMMENT 'VRF name as configured (CUST-ACME-L3)',
  `ROUTE_DISTINGUISHER` varchar(32) DEFAULT NULL COMMENT 'RD (64512:100)',
  `SERVICE_INSTANCE_ID_FK` int unsigned DEFAULT NULL COMMENT 'FK SERVICE_INSTANCE.ID: L3VPN the VRF belongs to, when known',
  `DESCRIPTION` varchar(255) DEFAULT NULL COMMENT 'VRF description',
  `STATUS` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'ACTIVE' COMMENT 'Status. Values: ACTIVE, SUSPENDED',
  `RECORD_SOURCE` varchar(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'DISCOVERED' COMMENT 'Origin of the row. Values: DISCOVERED, PLANNED_CIQ, MANUAL, EMS, EXTERNAL_SYNC',
  `CREATED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'When the row was created (UTC)',
  `CREATOR` bigint unsigned NOT NULL COMMENT 'USER.ID of who created the row (application stamp)',
  `MODIFIED_TIME` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT 'When the row was last changed (UTC)',
  `LAST_MODIFIER` bigint unsigned NOT NULL COMMENT 'USER.ID of who last changed the row (application stamp)',
  `ROW_VERSION` int unsigned NOT NULL DEFAULT '0' COMMENT 'Optimistic-lock counter',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UK_VRF__CUSTOMER_ID_ID` (`CUSTOMER_ID`,`ID`),
  UNIQUE KEY `UK_VRF__NETWORK_ELEMENT_ID_ID` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`ID`),
  UNIQUE KEY `UK_VRF__NETWORK_ELEMENT_ID_NAME` (`CUSTOMER_ID`,`NETWORK_ELEMENT_ID_FK`,`NAME`),
  UNIQUE KEY `UK_VRF__RESOURCE_ID` (`CUSTOMER_ID`,`RESOURCE_ID_FK`,`RESOURCE_TYPE`),
  KEY `IDX_VRF__SERVICE_INSTANCE_ID` (`CUSTOMER_ID`,`SERVICE_INSTANCE_ID_FK`),
  CONSTRAINT `FK_VRF__CUSTOMER_ID` FOREIGN KEY (`CUSTOMER_ID`) REFERENCES `TENANT` (`ID`),
  CONSTRAINT `FK_VRF__NETWORK_ELEMENT_ID` FOREIGN KEY (`CUSTOMER_ID`, `NETWORK_ELEMENT_ID_FK`) REFERENCES `NETWORK_ELEMENT` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `FK_VRF__RESOURCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `RESOURCE_ID_FK`, `RESOURCE_TYPE`) REFERENCES `RESOURCE` (`CUSTOMER_ID`, `ID`, `RESOURCE_TYPE`) ON DELETE CASCADE,
  CONSTRAINT `FK_VRF__SERVICE_INSTANCE_ID` FOREIGN KEY (`CUSTOMER_ID`, `SERVICE_INSTANCE_ID_FK`) REFERENCES `SERVICE_INSTANCE` (`CUSTOMER_ID`, `ID`),
  CONSTRAINT `CK_VRF__RECORD_SOURCE_VALUES` CHECK ((`RECORD_SOURCE` in (_utf8mb4'DISCOVERED',_utf8mb4'PLANNED_CIQ',_utf8mb4'MANUAL',_utf8mb4'EMS',_utf8mb4'EXTERNAL_SYNC'))),
  CONSTRAINT `CK_VRF__RESOURCE_TYPE` CHECK ((`RESOURCE_TYPE` = _utf8mb4'VRF')),
  CONSTRAINT `CK_VRF__STATUS_VALUES` CHECK ((`STATUS` in (_utf8mb4'ACTIVE',_utf8mb4'SUSPENDED')))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='VRF instance on a router (RESOURCE_TYPE VRF); PORT.VRF_ID_FK binds interfaces to it. New DDL: the table was referenced but missing from the v4 dump. [v6, 2026-09-28]';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `VRF`
--

LOCK TABLES `VRF` WRITE;
/*!40000 ALTER TABLE `VRF` DISABLE KEYS */;
INSERT INTO `VRF` VALUES (1,1,33,'VRF',1,'CUST-ACME-L3','64512:100',1,'ACME Ltd L3VPN','ACTIVE','DISCOVERED','2026-09-28 08:15:11.556',6,'2026-09-28 08:15:11.571',6,0);
/*!40000 ALTER TABLE `VRF` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-28 16:29:46
