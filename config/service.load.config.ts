import { ServiceStorage } from '../core/engine/service.engine';
import { SecurityServices } from '../core/service-definition/security.service';

const ServiceLoad: ServiceStorage = {};

Object.assign(ServiceLoad, SecurityServices);

export { ServiceLoad };
